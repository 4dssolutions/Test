<?php

namespace Espo\Custom\Services;

use Espo\Core\Services\Base;

class TwilioService extends Base
{
    public function sendSms($to, $body)
    {
        return $this->sendMessage($to, $body, false);
    }

    public function sendWhatsApp($to, $body)
    {
        return $this->sendMessage($to, $body, true);
    }

    public function sendFollowUpCall($to, $reason)
    {
        $accountSid = $this->getConfig()->get('twilioAccountSid');
        $authToken = $this->getConfig()->get('twilioAuthToken');
        $from = $this->getConfig()->get('twilioFromNumber');
        $voiceUrl = $this->getConfig()->get('twilioVoiceUrl');

        if (!$accountSid || !$authToken || !$from || !$voiceUrl) {
            $this->getContainer()->get('logger')->warning(
                'Twilio voice configuration missing.'
            );
            return false;
        }

        $payload = [
            'To' => $to,
            'From' => $from,
            'Url' => $voiceUrl,
        ];

        return $this->postToTwilio('/Calls.json', $payload, $reason);
    }

    private function sendMessage($to, $body, $isWhatsApp)
    {
        $accountSid = $this->getConfig()->get('twilioAccountSid');
        $authToken = $this->getConfig()->get('twilioAuthToken');
        $fromNumber = $this->getConfig()->get('twilioFromNumber');
        $whatsAppFrom = $this->getConfig()->get('twilioWhatsAppFrom');

        if (!$accountSid || !$authToken || !$fromNumber) {
            $this->getContainer()->get('logger')->warning(
                'Twilio SMS configuration missing.'
            );
            return false;
        }

        $from = $fromNumber;
        if ($isWhatsApp) {
            $from = $whatsAppFrom ?: ('whatsapp:' . $fromNumber);
            $to = 'whatsapp:' . $to;
        }

        $payload = [
            'To' => $to,
            'From' => $from,
            'Body' => $body,
        ];

        return $this->postToTwilio('/Messages.json', $payload, 'message');
    }

    private function postToTwilio($path, array $payload, $context)
    {
        $accountSid = $this->getConfig()->get('twilioAccountSid');
        $authToken = $this->getConfig()->get('twilioAuthToken');

        if (!$accountSid || !$authToken) {
            return false;
        }

        $url = 'https://api.twilio.com/2010-04-01/Accounts/' . $accountSid . $path;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
        curl_setopt($ch, CURLOPT_USERPWD, $accountSid . ':' . $authToken);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($error || $status >= 400) {
            $message = $error ?: $response;
            $this->getContainer()->get('logger')->warning(
                'Twilio request failed (' . $context . '): ' . $message
            );
            return false;
        }

        return true;
    }
}
