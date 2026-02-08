<?php

namespace Espo\Custom\Services;

use Espo\Core\Services\Base;
use Espo\Core\ORM\Entity;

class CommunicationService extends Base
{
    public function sendBookingConfirmation(Entity $booking)
    {
        $clientName = $booking->get('clientName') ?: 'there';
        $bookingDate = $booking->get('bookingDate');
        $dateText = $bookingDate ? (' on ' . $bookingDate) : '';
        $message = 'Hi ' . $clientName . ', your booking is confirmed' . $dateText .
            '. We will be in touch shortly. - Refined Digital';

        $email = $booking->get('clientEmail');
        $phone = $booking->get('clientPhone');

        if ($email) {
            $this->sendEmail($email, 'Booking Confirmation', $message);
        }

        if ($phone) {
            $twilio = $this->getContainer()->get('serviceFactory')->create('Twilio');
            if ($twilio) {
                $twilio->sendSms($phone, $message);
                $twilio->sendWhatsApp($phone, $message);
            }
        }
    }

    private function sendEmail($to, $subject, $body)
    {
        try {
            $emailSender = $this->getContainer()->get('emailSender');
            $email = $this->getEntityManager()->getEntity('Email');
            $email->set([
                'to' => $to,
                'subject' => $subject,
                'body' => $body,
                'status' => 'Sending',
                'isHtml' => false,
            ]);

            $emailSender->send($email);
        } catch (\Throwable $e) {
            $this->getContainer()->get('logger')->warning(
                'Email send failed: ' . $e->getMessage()
            );
        }
    }
}
