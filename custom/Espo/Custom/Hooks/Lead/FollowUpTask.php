<?php

namespace Espo\Custom\Hooks\Lead;

use Espo\Core\Hooks\Base;
use Espo\Core\ORM\Entity;

class FollowUpTask extends Base
{
    public static $order = 10;

    public function afterSave(Entity $entity, array $options = [])
    {
        if (!empty($options['skipFollowUpTask'])) {
            return;
        }

        if (!$entity->isAttributeChanged('followUpDate')) {
            return;
        }

        $followUpDate = $entity->get('followUpDate');
        if (!$followUpDate) {
            return;
        }

        $taskRepository = $this->getEntityManager()->getRepository('Task');
        $existingTask = $taskRepository
            ->where([
                'parentType' => 'Lead',
                'parentId' => $entity->id,
                'dateStart' => $followUpDate,
            ])
            ->findOne();

        if ($existingTask) {
            return;
        }

        $task = $this->getEntityManager()->getEntity('Task');
        $task->set([
            'name' => 'Lead Follow-up: ' . $entity->get('name'),
            'status' => 'Not Started',
            'priority' => 'Normal',
            'dateStart' => $followUpDate,
            'parentType' => 'Lead',
            'parentId' => $entity->id,
        ]);

        $assignedUserId = $entity->get('assignedUserId');
        if ($assignedUserId) {
            $task->set('assignedUserId', $assignedUserId);
        }

        $task->set('reminders', [
            [
                'type' => 'Popup',
                'minutes' => 0,
            ],
        ]);

        $this->getEntityManager()->saveEntity($task, ['skipHooks' => true]);
    }
}
