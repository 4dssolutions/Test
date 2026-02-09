<?php

namespace Espo\Custom\EntryPoints;

use Espo\Core\EntryPoints\Base;
use Espo\Core\Exceptions\Forbidden;

class BookingCapture extends Base
{
    public static $authRequired = false;

    public function run()
    {
        $request = $this->getContainer()->get('request');
        $data = $request->getParsedBody();
        if (!is_array($data)) {
            $raw = $request->getBody();
            $data = json_decode($raw, true) ?: [];
        }

        $token = $request->getHeader('X-Webhook-Token') ?: ($data['token'] ?? null);
        $expectedToken = $this->getConfig()->get('twilioWebhookToken');
        if ($expectedToken && $token !== $expectedToken) {
            throw new Forbidden();
        }

        $repository = $this->getEntityManager()->getRepository('Booking');
        $callSid = $data['CallSid'] ?? ($data['callSid'] ?? null);
        if ($callSid) {
            $existing = $repository->where(['twilioCallSid' => $callSid])->findOne();
            if ($existing) {
                $this->respond(['success' => true, 'id' => $existing->id]);
                return;
            }
        }

        $booking = $this->getEntityManager()->getEntity('Booking');
        $booking->set([
            'clientName' => $data['clientName'] ?? ($data['CallerName'] ?? null),
            'clientEmail' => $data['clientEmail'] ?? null,
            'clientPhone' => $data['clientPhone'] ?? ($data['From'] ?? null),
            'bookingDate' => $data['bookingDate'] ?? null,
            'source' => $data['source'] ?? 'Phone',
            'message' => $data['message'] ?? null,
            'twilioCallSid' => $callSid,
            'twilioRecordingUrl' => $data['RecordingUrl'] ?? ($data['recordingUrl'] ?? null),
            'twilioAgent' => $data['agent'] ?? ($data['Agent'] ?? null),
            'callDuration' => $data['CallDuration'] ?? ($data['callDuration'] ?? null),
        ]);

        if (!$booking->get('name')) {
            $identifier = $booking->get('clientName') ?: $booking->get('clientPhone') ?: 'Unknown';
            $booking->set('name', 'Booking - ' . $identifier);
        }

        $this->getEntityManager()->saveEntity($booking);

        $this->respond(['success' => true, 'id' => $booking->id]);
    }

    private function respond(array $payload)
    {
        $response = $this->getContainer()->get('response');
        $response->setHeader('Content-Type', 'application/json');
        $response->writeBody(json_encode($payload));
    }
}
