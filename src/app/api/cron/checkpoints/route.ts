import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const keyParam = request.nextUrl.searchParams.get('key');

    // Verify authorization
    if (cronSecret) {
      const authorized =
        isVercelCron ||
        authHeader === `Bearer ${cronSecret}` ||
        keyParam === cronSecret;

      if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@orbit.app';

    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: 'VAPID keys not configured on server' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Compute current date and time in IST (UTC+5:30)
    const nowUtc = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(nowUtc.getTime() + istOffsetMs);
    const todayStr = format(nowIst, 'yyyy-MM-dd');
    const currentHour = nowIst.getUTCHours();
    const currentMinute = nowIst.getUTCMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;

    // Detect checkpoint
    let checkpoint = request.nextUrl.searchParams.get('checkpoint');
    if (!checkpoint) {
      if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60) {
        checkpoint = 'morning_730';
      } else if (totalMinutes >= 9 * 60 && totalMinutes < 12 * 60) {
        checkpoint = 'morning_900';
      } else if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 4 * 60) {
        checkpoint = 'night_2200';
      } else {
        checkpoint = 'morning_730';
      }
    }

    // Retrieve active push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscription')
      .select('*');

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No push subscriptions registered.',
        checkpoint,
        date: todayStr,
      });
    }

    let sentCount = 0;
    let skippedCount = 0;
    let cleanedUpCount = 0;

    for (const sub of subscriptions) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      let shouldSend = false;
      let title = '';
      let body = '';
      let url = '/planner';
      let tag = `orbit-${checkpoint}-${todayStr}`;

      if (checkpoint === 'morning_730' || checkpoint === 'morning_900') {
        // Check if user has scheduled any real tasks for today
        const { count, error } = await supabase
          .from('task')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', sub.user_id)
          .eq('scheduled_date', todayStr);

        const taskCount = count ?? 0;
        if (!error && taskCount === 0) {
          shouldSend = true;
          if (checkpoint === 'morning_730') {
            title = 'Orbit · Morning Orbit Check (7:30 AM)';
            body = "Your day isn't planned yet. Set your focus for today and stay in orbit.";
            url = '/planner';
          } else {
            title = 'Orbit · Final Morning Call (9:00 AM)';
            body = '0 tasks scheduled for today. Lock in your core study block before the day slips away.';
            url = '/planner';
          }
        } else {
          skippedCount++;
        }
      } else if (checkpoint === 'night_2200') {
        // Check if user has logged their reflection for today
        const { count, error } = await supabase
          .from('reflection')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', sub.user_id)
          .eq('day', todayStr);

        const reflectionCount = count ?? 0;
        if (!error && reflectionCount === 0) {
          shouldSend = true;
          title = 'Orbit · Evening Debrief (10:00 PM)';
          body = 'Time to close your loop. Log your wins, blockers, and energy rating for today.';
          url = '/journey';
        } else {
          skippedCount++;
        }
      }

      if (shouldSend) {
        const payload = JSON.stringify({
          title,
          body,
          url,
          tag,
          sound: '/sounds/orbit-chime.wav',
        });

        try {
          await webpush.sendNotification(pushConfig, payload);
          sentCount++;
        } catch (err: any) {
          // If subscription has expired or unsubscribed, remove from DB
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from('push_subscription').delete().eq('id', sub.id);
            cleanedUpCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkpoint,
      date: todayStr,
      totalSubscribers: subscriptions.length,
      sentCount,
      skippedCount,
      cleanedUpCount,
    });
  } catch (err: any) {
    console.error('[Orbit Cron Checkpoint Error]', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error in cron checkpoint' },
      { status: 500 }
    );
  }
}
