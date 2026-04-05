# 🎯 Objetivo

Construir una plataforma web multi-cliente para:

- Visibilidad de proyectos para clientes
- Organización interna del equipo
- Gestión de tickets y tareas separadas
- Eliminación de comunicación desordenada
- Trazabilidad completa

---

# 🧩 Modelo del sistema

## Entidades

- Company (Empresa/Cliente)
- User
- Project
- Phase
- Task
- Ticket
- Proposal
- File
- AuditLog

---

# 🔗 Relaciones

- Company → muchos Users
- Company → muchos Projects
- Project → pertenece a Company
- Project → tiene Phases, Tasks, Tickets, Proposals

- Ticket:
  - pertenece a Company
  - opcionalmente a Project
  - puede generar Tasks

- Task:
  - pertenece a Phase o no
  - tiene un solo responsable
  - puede depender de otra Task

---

# 👥 Roles

| Key | Label | Descripción |
|-----|-------|-------------|
| ACCOUNT_OWNER | Account Owner | Cliente propietario de la cuenta |
| COLLABORATOR | Collaborator | Miembro del equipo del cliente |
| SYSTEM_ADMIN | System Admin | Administrador del sistema (equipo interno)|
| PROJECT_LEAD | Project Lead | Gerente de proyecto (equipo interno)|
| DELIVERY_SPECIALIST | Delivery Specialist | Especialista de entrega (equipo interno)|

### Jerarquía (mayor a menor)
1. SYSTEM_ADMIN
2. ACCOUNT_OWNER
3. PROJECT_LEAD
4. DELIVERY_SPECIALIST
5. COLLABORATOR

---

# 🔐 Reglas de visibilidad

Clientes NO ven:
- tareas internas
- notas internas
- tiempos de ejecución

Clientes SI ven:
- proyectos
- fases
- tickets

---

# 📊 Módulos

## Cliente
- Dashboard
- Proyectos
- Tickets
- Equipo

## Interno
- Dashboard
- Clientes
- Proyectos
- Tareas
- Tickets
- Configuración

---

# 🔄 Flujo de proyectos

1. Crear Company
2. Invitar usuarios
3. Crear Project
4. Clonar fases
5. Asignar equipo
6. Crear tareas base
7. Publicar

---

# 🧾 Tickets

Estados:
- pendiente
- en revisión
- en proceso
- cerrado

Flujo:
- creación → pendiente
- toma → en revisión
- respuesta → en proceso
- cierre automático si 72h sin respuesta

---

# 💡 Propuestas

- creadas por team
- aprobadas/rechazadas por cliente
- afectan timeline
- generan tareas

---

# 📌 Estados

## Proyecto
- planificación
- desarrollo
- pruebas
- revisión cliente
- producción
- pausado
- finalizado

## Fase
- planificación
- desarrollo
- pruebas
- revisión
- producción
- completada

## Task
- pendiente
- en progreso
- bloqueada
- completada

---

# ⚡ Prioridades

- baja
- media
- alta
- urgente

---

# ⏱ SLA

- urgente → 48h
- alta → 48h
- media → 72h
- baja → 5 días

---

# 🔔 Notificaciones

Eventos:
- ticket nuevo
- comentario
- tarea asignada
- vencimiento
- retrasos

Formato:
- popup/globo

---

# 📁 Archivos

- por proyecto (docs, entregables)
- por ticket (evidencias)

---

# 🧾 Auditoría

Registrar:
- cambios de estado
- asignaciones
- comentarios
- uploads
- fechas
- propuestas

---

# ⚠️ Principios

- separación tickets vs tareas
- trazabilidad completa
- escalabilidad
- consistencia estructural