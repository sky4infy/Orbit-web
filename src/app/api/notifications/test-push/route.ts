import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const { subscription, title, body, url } = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Missing subscription details' }, { status: 400 });
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@orbit.app';

    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: 'VAPID keys are not configured on the server' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title: title || 'Orbit · Background Push Verified 🪐',
      body: body || 'Success! This notification arrived from the cloud server. It works even when Orbit is closed.',
      url: url || '/planner',
      tag: 'orbit-test-' + Date.now(),
      sound: '/sounds/orbit-chime.wav',
    });

    await webpush.sendNotification(subscription, payload);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[WebPush Test Error]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to send web push' },
      { status: 500 }
    );
  }
}
