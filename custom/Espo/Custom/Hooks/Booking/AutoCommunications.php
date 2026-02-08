<?php

namespace Espo\Custom\Hooks\Booking;

use Espo\Core\Hooks\Base;
use Espo\Core\ORM\Entity;

class AutoCommunications extends Base
{
    public static $order = 10;

    public function afterSave(Entity $entity, array $options = [])
    {
        if (!empty($options['skipAutoCommunications'])) {
            return;
        }

        if (!$entity->isNew()) {
            return;
        }

        try {
            $service = $this->getContainer()->get('serviceFactory')->create('CommunicationService');
            if ($service) {
                $service->sendBookingConfirmation($entity);
            }
        } catch (\Throwable $e) {
            $this->getContainer()->get('logger')->error(
                'Booking auto-communication failed: ' . $e->getMessage()
            );
        }
    }
}
