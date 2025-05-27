# H.E.L.E.N (Recepcionista Virtual con IA)

**H.E.L.E.N** son las siglas de **H**erramienta **E**lectrónica de **L**lamadas, **E**ventos y **N**otificaciones.

Es un proyecto de recepcionista virtual que utiliza **Retell AI** para la interacción por voz y **n8n** para automatizar flujos de trabajo. Sus capacidades incluyen el agendamiento de citas directamente en **Google Calendar** y la posibilidad de responder a preguntas frecuentes.

Este proyecto nace de mi curiosidad por explorar las capacidades de la Inteligencia Artificial Conversacional y la automatización de procesos, siendo mi primera incursión con herramientas como n8n y Retell AI.

## Motivación y Objetivos

Como entusiasta de la tecnología y con una creciente curiosidad por el campo de la Inteligencia Artificial, decidí embarcarme en este proyecto para:

* Aprender los fundamentos de la IA conversacional.
* Explorar herramientas de automatización low-code/no-code como n8n.
* Entender cómo diferentes servicios (IA de voz, automatización, calendarios) pueden integrarse para crear soluciones funcionales.
* Poner en práctica la creación de un flujo de trabajo desde la concepción hasta una implementación básica.
* ¡Y sobre todo, divertirme aprendiendo y construyendo algo nuevo!

## Características Principales

* **Interacción por Voz:** Gracias a Retell AI, H.E.L.E.N puede entender y responder a solicitudes habladas.
* **Agendamiento de Citas:** Permite a los usuarios agendar citas que se registran automáticamente en Google Calendar.
* **Consulta de Disponibilidad:** Verifica la disponibilidad en Google Calendar antes de confirmar una cita.
* **Automatización de Flujos:** Utiliza n8n para orquestar las diferentes acciones y servicios.
* **(Potencial) Respuesta a Preguntas Frecuentes:** Diseñada con la capacidad de ser extendida para manejar FAQs.

## Cómo Funciona (Flujo de Trabajo)

El sistema opera mediante la interacción de varios componentes clave:

1.  **Interacción Inicial (Retell AI):**
    * El usuario interactúa con H.E.L.E.N a través de una interfaz de voz (gestionada por Retell AI).
    * Retell AI procesa la voz del usuario, la convierte en texto y entiende la intención (por ejemplo, "Quiero agendar una cita").
    * Se establece un diálogo para recopilar la información necesaria (fecha, hora, etc.), como se muestra en la conversación con "Don Saúl".

    ![image](https://github.com/user-attachments/assets/a8f6a07a-0c8b-4119-9302-bdeac646b4e3)


2.  **Automatización con n8n:**
    * Una vez que Retell AI tiene los datos para agendar la cita, envía esta información a un **Webhook** configurado en n8n.
    * El flujo de n8n se activa al recibir los datos del webhook.
    * **Verificación de Disponibilidad:** El primer nodo de Google Calendar en n8n (`availability: calendar`) consulta el calendario para verificar si el horario solicitado está libre.
    * **Creación del Evento:** Si el horario está disponible, el segundo nodo de Google Calendar (`create: event`) crea el evento en el calendario con los detalles proporcionados.
    * **(Opcional) Notificación:** n8n podría luego enviar una confirmación de vuelta a Retell AI para informar al usuario, o enviar una notificación por email/SMS.

    ![image](https://github.com/user-attachments/assets/b8ec5076-0c39-4589-8cfe-c4b3c2bd7c68)


3.  **Google Calendar:**
    * Actúa como la base de datos para las citas, almacenando los eventos creados.

## Tecnologías Utilizadas

* **Retell AI:** Para la interfaz de IA conversacional y procesamiento de voz.
* **n8n:** Como plataforma de automatización para conectar los servicios y ejecutar el flujo de trabajo.
* **Google Calendar API:** Para la gestión de eventos (consultar disponibilidad y crear citas).
* **Webhooks:** Para la comunicación en tiempo real entre Retell AI y n8n.
* **Conversational AI:** El campo general de IA que permite estas interacciones.

## Desafíos y Aprendizajes

* *Configuración inicial del webhook entre Retell AI y n8n.*
* *Manejo de formatos de fecha y hora entre sistemas.*
* *Comprensión de cómo la IA interpreta las intenciones del usuario.*
* *La importancia de probar cada paso del flujo de manera aislada y luego en conjunto.*

## Mejoras Futuras

* *Implementar la respuesta a preguntas frecuentes (FAQs).*
* *Añadir notificaciones de confirmación y recordatorios por email o SMS.*
* *Permitir la cancelación o reprogramación de citas.*
* *Soporte para múltiples calendarios o tipos de servicios.*
* *Mejorar el manejo de errores y la robustez del sistema.*
* *Explorar otras plataformas de IA conversacional o módulos de n8n.)*


---

**Visión y Potencial del Proyecto**

Este repositorio, con el proyecto H.E.L.E.N., nace con el objetivo de demostrar cómo se puede crear una solución de **asistente virtual inteligente** utilizando herramientas accesibles de IA conversacional (como Retell AI) y plataformas de automatización (como n8n). Busca ilustrar de manera práctica cómo combinar **IA conversacional, automatización en la nube y servicios de terceros** (como Google Calendar) en un flujo de trabajo funcional, modular y con potencial de escalabilidad.

Además, este proyecto sirve como una base inspiradora para:
* **Proyectos educativos:** Para quienes se inician en la IA conversacional, la automatización y la integración de APIs.
* **Hackathones:** Ofreciendo un punto de partida para desarrollar prototipos innovadores rápidamente.
* **Pruebas de concepto (PoC):** Para validar ideas de asistentes virtuales y automatización de tareas en entornos específicos antes de una inversión mayor.
