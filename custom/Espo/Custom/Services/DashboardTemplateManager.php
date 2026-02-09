<?php

namespace Espo\Custom\Services;

use Espo\Core\Services\Base;
use Espo\Core\ORM\Entity;

class DashboardTemplateManager extends Base
{
    public function getTemplateForUser(Entity $user)
    {
        if ($this->isOwnerUser($user)) {
            return $this->getOwnerTemplate();
        }

        return $this->getEmployeeTemplate();
    }

    public function getOwnerTemplate()
    {
        return $this->getOrCreateTemplate(
            'Refined Digital - Owner Dashboard',
            $this->getOwnerLayout(),
            $this->getOwnerOptions()
        );
    }

    public function getEmployeeTemplate()
    {
        return $this->getOrCreateTemplate(
            'Refined Digital - Employee Dashboard',
            $this->getEmployeeLayout(),
            $this->getEmployeeOptions()
        );
    }

    private function isOwnerUser(Entity $user): bool
    {
        if (method_exists($user, 'isAdmin') && $user->isAdmin()) {
            return true;
        }

        foreach ($this->getRoleNames($user) as $roleName) {
            $normalized = strtolower($roleName);
            if (strpos($normalized, 'owner') !== false || strpos($normalized, 'admin') !== false) {
                return true;
            }
        }

        return false;
    }

    private function getRoleNames(Entity $user): array
    {
        if (!method_exists($user, 'getLinkMultipleIdList')) {
            return [];
        }

        $roleIdList = $user->getLinkMultipleIdList('roles');
        if (empty($roleIdList)) {
            return [];
        }

        $roles = $this->getEntityManager()
            ->getRepository('Role')
            ->where(['id' => $roleIdList])
            ->find();

        $names = [];
        foreach ($roles as $role) {
            $names[] = $role->get('name');
        }

        return $names;
    }

    private function getOwnerLayout(): array
    {
        return [
            [
                'name' => 'Owner Overview',
                'id' => 'rd-owner-overview',
                'layout' => [
                    [
                        'id' => 'rdOwnerSales',
                        'name' => 'SalesPerformance',
                        'x' => 0,
                        'y' => 0,
                        'width' => 12,
                        'height' => 4
                    ],
                    [
                        'id' => 'rdOwnerLeads',
                        'name' => 'Records',
                        'x' => 0,
                        'y' => 4,
                        'width' => 6,
                        'height' => 2
                    ],
                    [
                        'id' => 'rdOwnerProjects',
                        'name' => 'Records',
                        'x' => 6,
                        'y' => 4,
                        'width' => 6,
                        'height' => 2
                    ],
                    [
                        'id' => 'rdOwnerBookings',
                        'name' => 'Records',
                        'x' => 0,
                        'y' => 6,
                        'width' => 6,
                        'height' => 2
                    ],
                    [
                        'id' => 'rdOwnerTasks',
                        'name' => 'Records',
                        'x' => 6,
                        'y' => 6,
                        'width' => 6,
                        'height' => 2
                    ],
                    [
                        'id' => 'rdOwnerStream',
                        'name' => 'Stream',
                        'x' => 0,
                        'y' => 8,
                        'width' => 12,
                        'height' => 2
                    ]
                ]
            ]
        ];
    }

    private function getEmployeeLayout(): array
    {
        return [
            [
                'name' => 'Employee Overview',
                'id' => 'rd-employee-overview',
                'layout' => [
                    [
                        'id' => 'rdEmployeeTasks',
                        'name' => 'Records',
                        'x' => 0,
                        'y' => 0,
                        'width' => 6,
                        'height' => 2
                    ],
                    [
                        'id' => 'rdEmployeeLeads',
                        'name' => 'Records',
                        'x' => 6,
                        'y' => 0,
                        'width' => 6,
                        'height' => 2
                    ],
                    [
                        'id' => 'rdEmployeeBookings',
                        'name' => 'Records',
                        'x' => 0,
                        'y' => 2,
                        'width' => 6,
                        'height' => 2
                    ],
                    [
                        'id' => 'rdEmployeeProjects',
                        'name' => 'Records',
                        'x' => 6,
                        'y' => 2,
                        'width' => 6,
                        'height' => 2
                    ],
                    [
                        'id' => 'rdEmployeeStream',
                        'name' => 'Stream',
                        'x' => 0,
                        'y' => 4,
                        'width' => 12,
                        'height' => 2
                    ]
                ]
            ]
        ];
    }

    private function getOwnerOptions(): array
    {
        return [
            'rdOwnerSales' => [
                'title' => 'Sales Performance'
            ],
            'rdOwnerLeads' => [
                'title' => 'Recent Leads',
                'entityType' => 'Lead',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5
            ],
            'rdOwnerProjects' => [
                'title' => 'Active Projects',
                'entityType' => 'Project',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5
            ],
            'rdOwnerBookings' => [
                'title' => 'Latest Bookings',
                'entityType' => 'Booking',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5
            ],
            'rdOwnerTasks' => [
                'title' => 'Open Tasks',
                'entityType' => 'Task',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5
            ],
            'rdOwnerStream' => [
                'title' => 'Team Activity',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5,
                'skipOwn' => false
            ]
        ];
    }

    private function getEmployeeOptions(): array
    {
        return [
            'rdEmployeeTasks' => [
                'title' => 'My Tasks',
                'entityType' => 'Task',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5
            ],
            'rdEmployeeLeads' => [
                'title' => 'My Leads',
                'entityType' => 'Lead',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5
            ],
            'rdEmployeeBookings' => [
                'title' => 'My Bookings',
                'entityType' => 'Booking',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5
            ],
            'rdEmployeeProjects' => [
                'title' => 'My Projects',
                'entityType' => 'Project',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5
            ],
            'rdEmployeeStream' => [
                'title' => 'Activity Stream',
                'displayRecords' => 10,
                'autorefreshInterval' => 0.5,
                'skipOwn' => false
            ]
        ];
    }

    private function getOrCreateTemplate(string $name, array $layout, array $options)
    {
        $repository = $this->getEntityManager()->getRepository('DashboardTemplate');
        $template = $repository->where(['name' => $name])->findOne();

        if ($template) {
            return $template;
        }

        $template = $this->getEntityManager()->getEntity('DashboardTemplate');
        $template->set([
            'name' => $name,
            'layout' => $layout,
            'dashletsOptions' => $options,
        ]);

        $this->getEntityManager()->saveEntity($template, ['skipHooks' => true]);

        return $template;
    }
}
