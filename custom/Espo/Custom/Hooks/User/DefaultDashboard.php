<?php

namespace Espo\Custom\Hooks\User;

use Espo\Core\Hooks\Base;
use Espo\Core\ORM\Entity;

class DefaultDashboard extends Base
{
    public static $order = 10;

    public function afterSave(Entity $entity, array $options = [])
    {
        if (!empty($options['skipDefaultDashboard'])) {
            return;
        }

        if (method_exists($entity, 'isPortal') && $entity->isPortal()) {
            return;
        }

        if (method_exists($entity, 'isApi') && $entity->isApi()) {
            return;
        }

        $preferences = $this->getEntityManager()->getEntity('Preferences', $entity->id);
        if (!$preferences) {
            return;
        }

        $layout = $preferences->get('dashboardLayout');
        if (is_array($layout) && count($layout) > 0) {
            return;
        }

        if (is_object($layout) && count((array) $layout) > 0) {
            return;
        }

        $serviceFactory = $this->getContainer()->get('serviceFactory');
        $manager = $serviceFactory->create('DashboardTemplateManager');
        if (!$manager) {
            return;
        }

        $template = $manager->getTemplateForUser($entity);
        if (!$template) {
            return;
        }

        $preferences->set([
            'dashboardLayout' => $template->get('layout'),
            'dashletsOptions' => $template->get('dashletsOptions'),
        ]);

        $this->getEntityManager()->saveEntity($preferences, ['skipHooks' => true]);
    }
}
