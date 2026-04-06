/**
 * Prisma Seed Script
 * Bootstraps the initial SYSTEM_ADMIN user, Aiderbrand internal company,
 * and a full set of sample data (companies, users, projects, phases, tasks, tickets).
 *
 * Usage: npm run db:seed
 *
 * IMPORTANT: Only run in development/staging. NEVER in production without
 * a proper secrets management solution for the admin password.
 */

import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── SLA helper ────────────────────────────────────────────────────────────────

const SLA_HOURS: Record<string, number> = {
  urgente: 48,
  alta: 48,
  media: 72,
  baja: 120,
}

function sla(priority: string, createdAt: Date): Date {
  const deadline = new Date(createdAt)
  deadline.setHours(deadline.getHours() + (SLA_HOURS[priority] ?? 72))
  return deadline
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...')

  const defaultPassword = await bcrypt.hash('Dev123456!', 12)

  // ─── Companies ────────────────────────────────────────────────────────────────

  const aiderbrand = await prisma.company.upsert({
    where: { slug: 'aiderbrand' },
    update: {},
    create: {
      name: 'Aiderbrand',
      slug: 'aiderbrand',
      isActive: true,
    },
  })
  console.log(`✅ Company: ${aiderbrand.name} (${aiderbrand.id})`)

  const acme = await prisma.company.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Solutions',
      slug: 'acme',
      isActive: true,
    },
  })
  console.log(`✅ Company: ${acme.name} (${acme.id})`)

  // ─── Initial SYSTEM_ADMIN ────────────────────────────────────────────────────

  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@aiderbrand.com'
  const adminPassword = process.env['SEED_ADMIN_PASSWORD'] ?? 'ChangeMe123!'
  const adminHash = await bcrypt.hash(adminPassword, 12)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'System Admin',
      passwordHash: adminHash,
      isActive: true,
    },
  })
  console.log(`✅ Admin user: ${adminUser.email} (${adminUser.id})`)

  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: adminUser.id, companyId: aiderbrand.id } },
    update: {},
    create: {
      userId: adminUser.id,
      companyId: aiderbrand.id,
      role: Role.SYSTEM_ADMIN,
      isActive: true,
    },
  })

  // ─── Sample users ─────────────────────────────────────────────────────────────

  const users = [
    { id: 'user-1', name: 'Ana García',      email: 'ana.garcia@aiderbrand.com',     role: Role.SYSTEM_ADMIN,       companyId: aiderbrand.id },
    { id: 'user-2', name: 'Bruno López',     email: 'bruno.lopez@aiderbrand.com',    role: Role.PROJECT_LEAD,        companyId: aiderbrand.id },
    { id: 'user-3', name: 'Carla Martínez',  email: 'carla.martinez@aiderbrand.com', role: Role.DELIVERY_SPECIALIST, companyId: aiderbrand.id },
    { id: 'user-4', name: 'Diego Fernández', email: 'diego.fernandez@acme.com',      role: Role.ACCOUNT_OWNER,       companyId: acme.id },
    { id: 'user-5', name: 'Elena Rodríguez', email: 'elena.rodriguez@acme.com',      role: Role.COLLABORATOR,        companyId: acme.id },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash: defaultPassword,
        isActive: true,
      },
    })

    await prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: u.id, companyId: u.companyId } },
      update: {},
      create: {
        userId: u.id,
        companyId: u.companyId,
        role: u.role,
        isActive: true,
      },
    })
  }
  console.log(`✅ Sample users and memberships created`)

  // ─── Projects ─────────────────────────────────────────────────────────────────

  const proj1 = await prisma.project.upsert({
    where: { id: 'proj-1' },
    update: {},
    create: {
      id: 'proj-1',
      companyId: aiderbrand.id,
      name: 'Portal de Clientes',
      description: 'Workspace principal para autoservicio de clientes corporativos y seguimiento operativo.',
      status: 'desarrollo',
      projectLeadId: 'user-2',
      deliveryOwnerId: 'user-3',
      targetLaunchAt: new Date('2026-04-18T09:00:00'),
      isDependencyReady: true,
      createdAt: new Date('2024-01-20T09:00:00'),
      updatedAt: new Date('2026-03-28T16:30:00'),
    },
  })

  const proj2 = await prisma.project.upsert({
    where: { id: 'proj-2' },
    update: {},
    create: {
      id: 'proj-2',
      companyId: aiderbrand.id,
      name: 'API de Pagos',
      description: 'Integración de cobros, webhooks y conciliación para operaciones transaccionales.',
      status: 'pruebas',
      projectLeadId: 'user-2',
      deliveryOwnerId: 'user-3',
      targetLaunchAt: new Date('2026-04-04T09:00:00'),
      isDependencyReady: true,
      createdAt: new Date('2024-02-01T09:00:00'),
      updatedAt: new Date('2026-03-29T09:10:00'),
    },
  })

  const proj3 = await prisma.project.upsert({
    where: { id: 'proj-3' },
    update: {},
    create: {
      id: 'proj-3',
      companyId: acme.id,
      name: 'Dashboard Analítico',
      description: 'Dashboard ejecutivo con KPIs en tiempo real y vistas accionables por área.',
      status: 'planificacion',
      isDependencyReady: false,
      targetLaunchAt: new Date('2026-05-16T09:00:00'),
      createdAt: new Date('2024-02-15T09:00:00'),
      updatedAt: new Date('2026-03-25T10:00:00'),
    },
  })
  console.log(`✅ Projects created: ${proj1.name}, ${proj2.name}, ${proj3.name}`)

  // ─── Phases ───────────────────────────────────────────────────────────────────

  const phases = [
    // Portal de Clientes
    { id: 'phase-portal-discovery', projectId: 'proj-1', companyId: aiderbrand.id, name: 'Discovery y definición',  order: 1, status: 'completada',   startsAt: new Date('2026-01-08T09:00:00'), dueAt: new Date('2026-01-22T18:00:00'), completedAt: new Date('2026-01-20T17:30:00'), ownerUserId: 'user-2', milestone: 'Alcance aprobado por dirección',                  blocker: null,                                                          isClientVisible: true },
    { id: 'phase-portal-build',     projectId: 'proj-1', companyId: aiderbrand.id, name: 'Desarrollo base',         order: 2, status: 'completada',   startsAt: new Date('2026-01-23T09:00:00'), dueAt: new Date('2026-02-28T18:00:00'), completedAt: new Date('2026-02-26T19:15:00'), ownerUserId: 'user-3', milestone: 'Módulos core desplegados en staging',                   blocker: null,                                                          isClientVisible: true },
    { id: 'phase-portal-qa',        projectId: 'proj-1', companyId: aiderbrand.id, name: 'QA y estabilización',     order: 3, status: 'pruebas',      startsAt: new Date('2026-03-01T09:00:00'), dueAt: new Date('2026-04-10T18:00:00'), completedAt: null,                            ownerUserId: 'user-3', milestone: 'Suite crítica validada y UAT habilitada',               blocker: 'Pendiente cerrar regresión en exportación masiva.',           isClientVisible: true },
    { id: 'phase-portal-launch',    projectId: 'proj-1', companyId: aiderbrand.id, name: 'Go-live controlado',      order: 4, status: 'planificacion', startsAt: new Date('2026-04-11T09:00:00'), dueAt: new Date('2026-04-18T18:00:00'), completedAt: null,                            ownerUserId: 'user-2', milestone: 'Salida gradual con monitoreo reforzado',               blocker: null,                                                          isClientVisible: true },
    // API de Pagos
    { id: 'phase-payments-1',       projectId: 'proj-2', companyId: aiderbrand.id, name: 'Arquitectura y contratos', order: 1, status: 'completada',  startsAt: new Date('2026-01-10T09:00:00'), dueAt: new Date('2026-01-24T18:00:00'), completedAt: new Date('2026-01-22T18:00:00'), ownerUserId: 'user-2', milestone: 'Contrato con gateway validado',                          blocker: null,                                                          isClientVisible: true },
    { id: 'phase-payments-2',       projectId: 'proj-2', companyId: aiderbrand.id, name: 'Integración y sandbox',   order: 2, status: 'completada',  startsAt: new Date('2026-01-25T09:00:00'), dueAt: new Date('2026-02-20T18:00:00'), completedAt: new Date('2026-02-18T17:00:00'), ownerUserId: 'user-3', milestone: 'Transacciones y reintentos probados en sandbox',        blocker: null,                                                          isClientVisible: true },
    { id: 'phase-payments-3',       projectId: 'proj-2', companyId: aiderbrand.id, name: 'Testing de integración',  order: 3, status: 'pruebas',     startsAt: new Date('2026-02-21T09:00:00'), dueAt: new Date('2026-04-01T18:00:00'), completedAt: null,                            ownerUserId: 'user-3', milestone: 'Webhook de confirmación estable en producción',      blocker: 'Timeouts intermitentes en confirmación del proveedor.',       isClientVisible: true },
    { id: 'phase-payments-4',       projectId: 'proj-2', companyId: aiderbrand.id, name: 'Release controlado',      order: 4, status: 'planificacion', startsAt: new Date('2026-04-02T09:00:00'), dueAt: new Date('2026-04-04T18:00:00'), completedAt: null,                           ownerUserId: 'user-2', milestone: 'Cutover con monitoreo de pagos reales',               blocker: null,                                                          isClientVisible: true },
    // Dashboard Analítico
    { id: 'phase-analytics-1',      projectId: 'proj-3', companyId: acme.id,       name: 'Descubrimiento funcional', order: 1, status: 'desarrollo', startsAt: new Date('2026-03-17T09:00:00'), dueAt: new Date('2026-04-01T18:00:00'), completedAt: null,                            ownerUserId: null,     milestone: 'Mapa de KPIs y audiencias validado',                    blocker: null,                                                          isClientVisible: true },
    { id: 'phase-analytics-2',      projectId: 'proj-3', companyId: acme.id,       name: 'Diseño y backlog inicial', order: 2, status: 'planificacion', startsAt: new Date('2026-04-02T09:00:00'), dueAt: new Date('2026-04-15T18:00:00'), completedAt: null,                          ownerUserId: null,     milestone: 'Backlog priorizado para construcción',                  blocker: null,                                                          isClientVisible: true },
  ]

  for (const phase of phases) {
    await prisma.phase.upsert({
      where: { id: phase.id },
      update: {},
      create: phase as any,
    })
  }
  console.log(`✅ ${phases.length} phases created`)

  // ─── Tasks ────────────────────────────────────────────────────────────────────

  const tasks = [
    // Portal de Clientes
    { id: 'task-portal-1', projectId: 'proj-1', companyId: aiderbrand.id, phaseId: 'phase-portal-qa',     title: 'Corregir regresión en exportación masiva',         status: 'en_progreso', priority: 'alta',    assigneeUserId: 'user-3', dueAt: new Date('2026-03-31T18:00:00'), visibleToClient: false, checklist: [{ id: 'task-portal-1-check-1', label: 'Reproducir el error con lotes grandes',   done: true  }, { id: 'task-portal-1-check-2', label: 'Aplicar paginado en la exportación',     done: false }] },
    { id: 'task-portal-2', projectId: 'proj-1', companyId: aiderbrand.id, phaseId: 'phase-portal-qa',     title: 'Validar fallback del login SSO en Safari',          status: 'pendiente',   priority: 'media',   assigneeUserId: 'user-2', dueAt: new Date('2026-04-02T12:00:00'), visibleToClient: false, checklist: [{ id: 'task-portal-2-check-1', label: 'Verificar login con fallback',             done: false }] },
    { id: 'task-portal-3', projectId: 'proj-1', companyId: aiderbrand.id, phaseId: 'phase-portal-launch', title: 'Preparar checklist de go-live con soporte',         status: 'pendiente',   priority: 'media',   assigneeUserId: 'user-2', dueAt: new Date('2026-04-08T17:00:00'), visibleToClient: false, checklist: [{ id: 'task-portal-3-check-1', label: 'Coordinar soporte de guardia',            done: false }, { id: 'task-portal-3-check-2', label: 'Compartir plan de rollback',            done: false }] },
    // API de Pagos
    { id: 'task-payments-1', projectId: 'proj-2', companyId: aiderbrand.id, phaseId: 'phase-payments-3', title: 'Mitigar timeout del proveedor en webhook',          status: 'bloqueada',   priority: 'urgente', assigneeUserId: 'user-2', dueAt: new Date('2026-03-28T18:00:00'), visibleToClient: false, blockReason: 'El proveedor sigue respondiendo fuera de ventana.', dependencyTaskId: 'task-payments-2', checklist: [{ id: 'task-payments-1-check-1', label: 'Escalar evidencia al proveedor',          done: true  }, { id: 'task-payments-1-check-2', label: 'Definir contingencia con endpoint alternativo', done: false }] },
    { id: 'task-payments-2', projectId: 'proj-2', companyId: aiderbrand.id, phaseId: 'phase-payments-3', title: 'Reprocesar pagos de prueba sobre endpoint alternativo', status: 'en_progreso', priority: 'alta', assigneeUserId: 'user-3', dueAt: new Date('2026-03-30T12:00:00'), visibleToClient: false, checklist: [{ id: 'task-payments-2-check-1', label: 'Reintentar pagos con endpoint alternativo', done: true  }, { id: 'task-payments-2-check-2', label: 'Documentar checksum final',               done: false }] },
    // Dashboard Analítico
    { id: 'task-analytics-1', projectId: 'proj-3', companyId: acme.id, phaseId: 'phase-analytics-1', title: 'Definir KPIs prioritarios para dirección',           status: 'en_progreso', priority: 'alta',  assigneeUserId: 'user-4', dueAt: new Date('2026-03-31T18:00:00'), visibleToClient: true,  checklist: [{ id: 'task-analytics-1-check-1', label: 'Validar KPIs de ventas',               done: true  }, { id: 'task-analytics-1-check-2', label: 'Cerrar métricas de retención',          done: false }] },
    { id: 'task-analytics-2', projectId: 'proj-3', companyId: acme.id, phaseId: 'phase-analytics-2', title: 'Consolidar backlog inicial del dashboard',           status: 'pendiente',   priority: 'media', assigneeUserId: 'user-5', dueAt: new Date('2026-04-05T18:00:00'), visibleToClient: true,  checklist: [{ id: 'task-analytics-2-check-1', label: 'Acordar prioridades con stakeholders',  done: false }] },
  ]

  // Insert tasks without dependencies first to avoid FK violations
  for (const task of tasks) {
    const { checklist, blockReason, dependencyTaskId: _dep, ...taskData } = task as any
    await prisma.task.upsert({
      where: { id: task.id },
      update: {},
      create: {
        ...taskData,
        blockReason: blockReason ?? null,
        dependencyTaskId: null,
      },
    })

    for (const item of checklist) {
      await prisma.taskChecklistItem.upsert({
        where: { id: item.id },
        update: {},
        create: { id: item.id, taskId: task.id, label: item.label, done: item.done },
      })
    }
  }

  // Now apply dependencies
  for (const task of tasks) {
    const dep = (task as any).dependencyTaskId
    if (dep) {
      await prisma.task.update({
        where: { id: task.id },
        data: { dependencyTaskId: dep },
      })
    }
  }
  console.log(`✅ Tasks and checklist items created`)

  // ─── Project notes ────────────────────────────────────────────────────────────

  const notes = [
    { id: 'note-portal-1',   projectId: 'proj-1', phaseId: 'phase-portal-qa',   authorId: 'user-3', parentId: null, body: 'El proveedor del motor CSV limita payloads grandes. Evaluar particionar exportación por lotes antes de UAT.',                                   createdAt: new Date('2026-03-28T11:15:00'), updatedAt: new Date('2026-03-28T11:15:00') },
    { id: 'note-portal-2',   projectId: 'proj-1', phaseId: null,                authorId: 'user-2', parentId: null, body: 'Cliente priorizó estabilidad del login y exportación por encima de nuevos filtros para el release de abril.',                               createdAt: new Date('2026-03-26T09:40:00'), updatedAt: new Date('2026-03-26T09:40:00') },
    { id: 'note-payments-1', projectId: 'proj-2', phaseId: 'phase-payments-3',  authorId: 'user-2', parentId: null, body: 'El proveedor confirmó ventana de mantenimiento no informada. Mantener release en hold hasta nuevo checksum.',                               createdAt: new Date('2026-03-28T17:05:00'), updatedAt: new Date('2026-03-28T17:05:00') },
  ]

  for (const note of notes) {
    await prisma.projectNote.upsert({
      where: { id: note.id },
      update: {},
      create: note,
    })
  }
  console.log(`✅ Project notes created`)

  // ─── Tickets ──────────────────────────────────────────────────────────────────

  const tickets = [
    { id: 'ticket-1',  companyId: aiderbrand.id, projectId: 'proj-1', title: 'Error en login con SSO',                          description: 'Los usuarios con SSO habilitado no pueden iniciar sesión. Aparece error 401 después del redirect de IdP.',                              status: 'en_proceso',  priority: 'urgente', createdById: 'user-4', assignedToId: 'user-3', createdAt: new Date('2026-03-25T09:00:00'), updatedAt: new Date('2026-03-25T11:30:00') },
    { id: 'ticket-2',  companyId: aiderbrand.id, projectId: 'proj-1', title: 'Exportar listado de clientes a CSV',               description: 'Se necesita un botón para exportar la tabla de clientes en formato CSV con todos los campos visibles.',                              status: 'pendiente',   priority: 'media',   createdById: 'user-2', assignedToId: null,     createdAt: new Date('2026-03-20T10:00:00'), updatedAt: new Date('2026-03-20T10:00:00') },
    { id: 'ticket-3',  companyId: aiderbrand.id, projectId: 'proj-1', title: 'Optimizar carga inicial del dashboard',            description: 'El dashboard tarda más de 8 segundos en cargar. Revisar queries y cachear respuestas frecuentes.',                               status: 'en_revision', priority: 'alta',    createdById: 'user-2', assignedToId: 'user-3', createdAt: new Date('2026-03-22T14:00:00'), updatedAt: new Date('2026-03-26T09:00:00') },
    { id: 'ticket-4',  companyId: aiderbrand.id, projectId: 'proj-2', title: 'Webhooks no se disparan en producción',            description: 'Los webhooks de confirmación de pago no llegan al endpoint del cliente. Logs muestran timeout.',                                   status: 'en_proceso',  priority: 'urgente', createdById: 'user-4', assignedToId: 'user-2', createdAt: new Date('2026-03-27T08:00:00'), updatedAt: new Date('2026-03-27T10:00:00') },
    { id: 'ticket-5',  companyId: aiderbrand.id, projectId: 'proj-2', title: 'Agregar soporte para pagos recurrentes',           description: 'Implementar suscripciones mensuales con cobro automático y notificación pre-débito.',                                             status: 'pendiente',   priority: 'alta',    createdById: 'user-2', assignedToId: null,     createdAt: new Date('2026-03-15T09:00:00'), updatedAt: new Date('2026-03-15T09:00:00') },
    { id: 'ticket-6',  companyId: aiderbrand.id, projectId: null,     title: 'Actualizar credenciales de acceso SFTP',           description: 'Las credenciales del servidor SFTP expiraron. Necesitan regenerarse y actualizar en los sistemas de cliente.',                   status: 'cerrado',     priority: 'alta',    createdById: 'user-3', assignedToId: 'user-3', createdAt: new Date('2026-03-10T11:00:00'), updatedAt: new Date('2026-03-11T09:30:00') },
    { id: 'ticket-7',  companyId: aiderbrand.id, projectId: null,     title: 'Consulta sobre facturación del mes de marzo',      description: 'El cliente consulta discrepancia en el monto de la factura de marzo vs lo contratado.',                                          status: 'en_revision', priority: 'baja',    createdById: 'user-4', assignedToId: 'user-1', createdAt: new Date('2026-03-28T08:00:00'), updatedAt: new Date('2026-03-28T08:00:00') },
    { id: 'ticket-8',  companyId: acme.id,       projectId: 'proj-3', title: 'Definir estructura de métricas del dashboard',     description: 'Acordar con el equipo qué KPIs y gráficos mostrar en la pantalla principal.',                                                    status: 'pendiente',   priority: 'media',   createdById: 'user-4', assignedToId: 'user-2', createdAt: new Date('2026-03-25T10:00:00'), updatedAt: new Date('2026-03-25T10:00:00') },
    { id: 'ticket-9',  companyId: acme.id,       projectId: null,     title: 'Acceso a entorno de staging',                      description: 'El equipo de Acme no puede acceder al entorno de staging. Solicitan credenciales.',                                              status: 'en_proceso',  priority: 'alta',    createdById: 'user-5', assignedToId: 'user-3', createdAt: new Date('2026-03-26T13:00:00'), updatedAt: new Date('2026-03-27T09:00:00') },
    { id: 'ticket-10', companyId: acme.id,       projectId: null,     title: 'Revisar SLA del contrato actual',                  description: 'El cliente solicita revisar los tiempos de respuesta definidos en el contrato vigente.',                                          status: 'pendiente',   priority: 'baja',    createdById: 'user-4', assignedToId: null,     createdAt: new Date('2026-03-27T14:00:00'), updatedAt: new Date('2026-03-27T14:00:00') },
  ]

  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: {},
      create: {
        ...ticket,
        slaDeadline: sla(ticket.priority, ticket.createdAt),
      } as any,
    })
  }
  console.log(`✅ ${tickets.length} tickets created`)

  // ─── Ticket comments ──────────────────────────────────────────────────────────

  const comments = [
    { id: 'comment-1',  ticketId: 'ticket-1', userId: 'user-4', type: 'public',   content: 'El problema ocurre en todos los navegadores, no es específico de Chrome. Adjunto log de errores del IdP.',               createdAt: new Date('2026-03-25T09:30:00') },
    { id: 'comment-2',  ticketId: 'ticket-1', userId: 'user-3', type: 'internal', content: 'Revisando los logs veo que el token de sesión no se está persistiendo correctamente. Probablemente un problema con las cookies SameSite.', createdAt: new Date('2026-03-25T10:15:00') },
    { id: 'comment-3',  ticketId: 'ticket-1', userId: 'user-2', type: 'internal', content: 'Confirmo el diagnóstico de Carla. Necesitamos actualizar la config de CORS también. Estimamos resolverlo en 2 horas.',    createdAt: new Date('2026-03-25T10:45:00') },
    { id: 'comment-4',  ticketId: 'ticket-1', userId: 'user-3', type: 'public',   content: 'Estamos trabajando en la solución. Te avisamos cuando esté resuelto.',                                                      createdAt: new Date('2026-03-25T11:00:00') },
    { id: 'comment-5',  ticketId: 'ticket-2', userId: 'user-2', type: 'public',   content: '¿Con qué campos exactamente? ¿Todos los visibles o incluir también los ocultos por permisos?',                            createdAt: new Date('2026-03-20T11:00:00') },
    { id: 'comment-6',  ticketId: 'ticket-2', userId: 'user-4', type: 'public',   content: 'Solo los campos visibles en pantalla. No incluir datos sensibles como teléfono interno.',                                  createdAt: new Date('2026-03-21T09:00:00') },
    { id: 'comment-7',  ticketId: 'ticket-3', userId: 'user-3', type: 'internal', content: 'Perfileé las queries. Hay 3 N+1 queries en el listado de clientes. Implementé caché con Redis para las más costosas.',    createdAt: new Date('2026-03-23T10:00:00') },
    { id: 'comment-8',  ticketId: 'ticket-3', userId: 'user-2', type: 'internal', content: 'Excelente. ¿Cuánto bajó el tiempo de carga con las optimizaciones?',                                                       createdAt: new Date('2026-03-24T09:30:00') },
    { id: 'comment-9',  ticketId: 'ticket-3', userId: 'user-3', type: 'internal', content: 'De 8.2s a 1.4s en promedio. Pasando a revisión para que valides los cambios.',                                             createdAt: new Date('2026-03-25T14:00:00') },
    { id: 'comment-10', ticketId: 'ticket-4', userId: 'user-4', type: 'public',   content: 'Urgente. Estamos perdiendo confirmaciones de pago. El equipo de finanzas está esperando.',                                 createdAt: new Date('2026-03-27T08:30:00') },
    { id: 'comment-11', ticketId: 'ticket-4', userId: 'user-2', type: 'internal', content: 'Revisando. El endpoint del cliente responde con 503. Parece que su servidor tiene un problema de capacidad.',              createdAt: new Date('2026-03-27T09:00:00') },
    { id: 'comment-12', ticketId: 'ticket-4', userId: 'user-2', type: 'public',   content: 'Confirmamos que el problema está en el servidor destino. ¿Tienen contacto técnico disponible para coordinar?',             createdAt: new Date('2026-03-27T09:45:00') },
    { id: 'comment-13', ticketId: 'ticket-6', userId: 'user-3', type: 'public',   content: 'Credenciales regeneradas y enviadas por canal seguro. Favor confirmar acceso.',                                            createdAt: new Date('2026-03-10T15:00:00') },
    { id: 'comment-14', ticketId: 'ticket-6', userId: 'user-4', type: 'public',   content: 'Acceso confirmado. Gracias por la rapidez.',                                                                                createdAt: new Date('2026-03-11T09:00:00') },
    { id: 'comment-15', ticketId: 'ticket-7', userId: 'user-1', type: 'public',   content: 'Revisando el detalle de facturación. ¿Podés indicar el número de factura específico?',                                     createdAt: new Date('2026-03-28T08:30:00') },
    { id: 'comment-16', ticketId: 'ticket-7', userId: 'user-4', type: 'public',   content: 'Es la factura FAC-2026-0089. El monto difiere en $4.500 ARS respecto al contrato.',                                        createdAt: new Date('2026-03-28T09:00:00') },
    { id: 'comment-17', ticketId: 'ticket-8', userId: 'user-2', type: 'public',   content: 'Propongo arrancar con: tickets por estado, tiempo medio de resolución, y SLA cumplido vs vencido.',                       createdAt: new Date('2026-03-25T14:00:00') },
    { id: 'comment-18', ticketId: 'ticket-8', userId: 'user-4', type: 'public',   content: 'Me parece bien. Agregar también un indicador de proyectos activos vs pausados.',                                          createdAt: new Date('2026-03-26T09:00:00') },
    { id: 'comment-19', ticketId: 'ticket-9', userId: 'user-3', type: 'public',   content: 'Creé el usuario en el entorno de staging. Las credenciales fueron enviadas al email registrado.',                          createdAt: new Date('2026-03-27T10:00:00') },
    { id: 'comment-20', ticketId: 'ticket-9', userId: 'user-5', type: 'public',   content: 'Recibí las credenciales, estoy intentando acceder. Dame unos minutos para confirmar.',                                     createdAt: new Date('2026-03-27T10:30:00') },
  ]

  for (const comment of comments) {
    await prisma.ticketComment.upsert({
      where: { id: comment.id },
      update: {},
      create: comment as any,
    })
  }
  console.log(`✅ ${comments.length} comments created`)

  // ─── Initial audit log ────────────────────────────────────────────────────────

  await prisma.auditLog.create({
    data: {
      actorId: null,
      companyId: aiderbrand.id,
      action: 'seed.initial_admin_created',
      entityType: 'User',
      entityId: adminUser.id,
      metadata: {
        email: adminEmail,
        role: Role.SYSTEM_ADMIN,
        seededAt: new Date().toISOString(),
      },
    },
  })

  console.log('\n🎉 Seeding complete!')
  console.log(`\nAdmin credentials:`)
  console.log(`  Email:    ${adminEmail}`)
  console.log(`  Password: ${adminPassword}`)
  console.log(`\nSample users password: Dev123456!`)
  console.log(`⚠️  CHANGE PASSWORDS IMMEDIATELY AFTER FIRST LOGIN!`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
