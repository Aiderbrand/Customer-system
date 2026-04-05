# Reglas estrictas (NO NEGOCIABLE)

El agente NO debe:

- inventar lógica no definida
- asumir campos o estructuras
- modificar estructuras aprobadas
- romper consistencia
- simplificar partes críticas
- avanzar sin validar decisiones importantes

---

# Principios de desarrollo

1. Consistencia > velocidad
2. Escalabilidad > soluciones rápidas
3. Claridad > complejidad innecesaria
4. Backend sólido > UI prematura

---

# Arquitectura recomendada

## Backend
- Node.js (NestJS recomendado)
- Arquitectura modular

Patrón:
- Controller
- Service
- Repository
- Domain layer (cuando escale)

---

## Base de datos
- PostgreSQL

Reglas:
- usar UUIDs
- relaciones explícitas
- soft delete cuando aplique
- audit logs obligatorios

---

## Frontend
- React (Next.js)
- Componentes desacoplados

Patrón:
- container / presentational
- hooks reutilizables
- estado central

---

# Patrones de diseño

Usar SIEMPRE:

- Repository Pattern
- Service Layer
- DTO validation
- Event-driven (para notificaciones)
- State pattern (para tickets/proyectos)

Evitar:
- lógica en controllers
- queries directas en frontend
- lógica duplicada

---

# Seguridad

- multi-tenant estricto (por Company)
- validación en backend SIEMPRE
- RBAC (roles gra)
- sanitización de inputs
- control de acceso por recurso.
---

# Flujo de desarrollo

El agente debe trabajar así:

1. Entender requerimiento
2. Validar con el usuario
3. Proponer solución
4. Dividir en pasos
5. Implementar por partes
6. Validar cada parte

---

# Modelado de features

Antes de desarrollar cualquier feature:

- definir entidades involucradas
- definir relaciones
- definir estados
- definir permisos
- definir edge cases

---

# Reglas UX/UI

- claridad sobre estética
- evitar sobrecarga visual y scroll inecesario
- mostrar solo lo necesario por rol
- feedback inmediato al usuario
- acciones críticas confirmadas
- notificacion de perdida de avance al clickear afuera de un modal

---

# Notificaciones

- event-driven
- desacopladas
- no bloquear flujo principal

---

# Dashboards

Cada rol debe ver:

- solo lo relevante
- métricas accionables
- no datos irrelevantes

---

# Decisiones técnicas

Cuando haya múltiples opciones:

El agente debe:
1. evaluar escalabilidad
2. evaluar mantenimiento
3. elegir la más simple que escale

---

# Testing

- lógica crítica debe ser testeable
- separar lógica de UI
- evitar acoplamientos

---

# Manejo de estados

Estados deben ser:

- explícitos
- consistentes
- controlados desde backend

Nunca hardcodeados en frontend.

---

# Auditoría

Toda acción relevante debe:

- registrarse
- ser trazable
- incluir usuario y timestamp

---

# Forma de output

El agente debe:

- evitar texto innecesario
- entregar código listo
- explicar solo lo necesario
- ser directo

---

# Interacción con el usuario

Modo:

- semi-guiado

El agente debe:
- preguntar cuando haya ambigüedad
- no asumir
- avanzar paso a paso en decisiones críticas

---

# Roles del sistema

Roles actuales:
- ACCOUNT_OWNER (Account Owner) - Cliente
- COLLABORATOR (Collaborator) - Miembro del equipo del cliente
- SYSTEM_ADMIN (System Admin) - Administrador del sistema (equipo interno)
- PROJECT_LEAD (Project Lead) - Gerente de proyecto (equipo interno)
- DELIVERY_SPECIALIST (Delivery Specialist) - Especialista de entrega (equipo interno)

---

# Regla final

Si una decisión puede romper:
- consistencia
- escalabilidad
- trazabilidad

El agente DEBE detenerse y consultar.