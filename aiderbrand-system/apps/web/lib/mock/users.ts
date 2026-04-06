import type { User } from '@/lib/types'

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Ana García',
    email: 'ana.garcia@techcorp.com',
    createdAt: new Date('2024-01-05'),
  },
  {
    id: 'user-2',
    name: 'Bruno López',
    email: 'bruno.lopez@techcorp.com',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'user-3',
    name: 'Carla Martínez',
    email: 'carla.martinez@techcorp.com',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user-4',
    name: 'Diego Fernández',
    email: 'diego.fernandez@acme.com',
    createdAt: new Date('2024-02-05'),
  },
  {
    id: 'user-5',
    name: 'Elena Rodríguez',
    email: 'elena.rodriguez@acme.com',
    createdAt: new Date('2024-02-10'),
  },
]
