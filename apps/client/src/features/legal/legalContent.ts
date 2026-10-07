export type LegalDocumentKey = 'privacy' | 'terms';

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  summary: string;
  sections: LegalSection[];
};

export const legalVersion = '7 de octubre de 2026';

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  privacy: {
    title: 'Política de privacidad',
    summary: 'Cómo trata OpoCompit tus datos y qué control tienes sobre ellos.',
    sections: [
      {
        title: '1. Responsable y contacto',
        paragraphs: [
          'OpoCompit es responsable del tratamiento descrito en esta política. El canal de contacto vigente aparece en la sección Soporte de esta pantalla.',
          'Esta política se aplica a la aplicación OpoCompit para Android y web.',
        ],
      },
      {
        title: '2. Datos que tratamos',
        paragraphs: [
          'Solo tratamos los datos necesarios para prestar el servicio y mantener el progreso entre sesiones.',
        ],
        bullets: [
          'Identidad y cuenta: identificador técnico, correo cuando se vincula una cuenta y proveedor de acceso.',
          'Perfil público: nombre de usuario, avatar, nivel, estadísticas y territorio elegido por el usuario.',
          'Actividad de estudio: respuestas, resultados, errores, progreso, rachas, logros y recompensas.',
          'Actividad social: amistades, grupos, duelos, invitaciones, rankings y notificaciones internas.',
          'Preferencias, reportes de preguntas y solicitudes enviadas a soporte.',
          'Analítica de uso seudonimizada solo si el usuario la activa expresamente en Ajustes.',
        ],
      },
      {
        title: '3. Para qué los usamos',
        paragraphs: [
          'Usamos estos datos para autenticar la cuenta, guardar el progreso, seleccionar contenido compatible, calcular resultados y recompensas, habilitar funciones sociales, prevenir abusos y atender solicitudes.',
          'La analítica opcional se utiliza para conocer errores de navegación y mejorar los flujos del producto. Puede desactivarse en cualquier momento sin impedir el estudio.',
        ],
      },
      {
        title: '4. Base jurídica',
        paragraphs: [
          'El tratamiento necesario para crear la sesión, guardar el progreso y prestar las funciones solicitadas se basa en la ejecución del servicio. La seguridad y prevención de fraude responden al interés legítimo de proteger OpoCompit y sus usuarios.',
          'La analítica opcional se basa en el consentimiento. Retirarlo no afecta al tratamiento realizado antes de su retirada.',
        ],
      },
      {
        title: '5. Proveedores y transferencias',
        paragraphs: [
          'OpoCompit utiliza servicios de Google Firebase para autenticación, base de datos, funciones de servidor y, cuando existe consentimiento, analítica web. Google procesa esos datos como proveedor tecnológico conforme a sus condiciones y medidas de seguridad.',
          'No vendemos datos personales. La versión actual no activa publicidad personalizada ni comparte datos con anunciantes.',
        ],
      },
      {
        title: '6. Conservación y eliminación',
        paragraphs: [
          'Los datos sincronizados se conservan mientras la cuenta esté activa. Desde Ajustes se puede eliminar la cuenta, el perfil, el progreso, el inventario y las relaciones sociales. Algunos registros competitivos o reportes pueden conservarse anonimizados para mantener la integridad del servicio.',
          'Los datos de una sesión exclusivamente local permanecen en el dispositivo hasta que se elimina la cuenta local, se borran los datos de la aplicación o se desinstala.',
          'Los proveedores pueden mantener copias técnicas o registros de seguridad durante sus periodos limitados de respaldo y cumplimiento.',
        ],
      },
      {
        title: '7. Tus derechos',
        paragraphs: [
          'Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad mediante el canal de Soporte. También puedes retirar el consentimiento de analítica desde Ajustes.',
          'Si consideras que el tratamiento no es correcto, puedes reclamar ante la Agencia Española de Protección de Datos u otra autoridad competente.',
        ],
      },
      {
        title: '8. Seguridad y menores',
        paragraphs: [
          'Aplicamos autenticación, reglas de acceso y validación de servidor. Las comunicaciones con Firebase se realizan mediante conexiones cifradas.',
          'OpoCompit está orientada a personas que preparan oposiciones y no está diseñada específicamente para menores. No solicitamos fecha de nacimiento ni ubicación precisa.',
        ],
      },
      {
        title: '9. Cambios',
        paragraphs: [
          'Mostraremos una nueva fecha de versión cuando esta política cambie de forma relevante. Los cambios que requieran consentimiento se presentarán antes de activar el tratamiento correspondiente.',
        ],
      },
    ],
  },
  terms: {
    title: 'Términos de uso',
    summary: 'Reglas básicas para utilizar OpoCompit y participar de forma justa.',
    sections: [
      {
        title: '1. Objeto del servicio',
        paragraphs: [
          'OpoCompit es una herramienta educativa y competitiva para practicar preguntas de oposiciones. No forma parte de ninguna administración pública ni garantiza aprobar una convocatoria.',
        ],
      },
      {
        title: '2. Cuenta e invitado',
        paragraphs: [
          'Puedes comenzar como invitado y vincular después una cuenta. Eres responsable de mantener seguro tu método de acceso y de la actividad realizada con tu cuenta.',
          'El nombre público no debe suplantar a otra persona, revelar datos sensibles ni contener contenido ofensivo.',
        ],
      },
      {
        title: '3. Contenido educativo',
        paragraphs: [
          'Trabajamos para que las preguntas sean correctas y estén actualizadas, pero la normativa y las convocatorias pueden cambiar. Debes contrastar la información con las fuentes oficiales.',
          'Puedes reportar preguntas incorrectas, desactualizadas o con explicaciones mejorables desde el propio test.',
        ],
      },
      {
        title: '4. Juego limpio',
        paragraphs: [
          'No está permitido manipular resultados, automatizar respuestas, explotar errores, interferir en el servicio ni utilizar identidades de otras personas. Podemos limitar funciones o bloquear una cuenta ante fraude o abuso comprobado.',
        ],
      },
      {
        title: '5. Monedas, gemas y objetos',
        paragraphs: [
          'Las monedas, gemas, puntos y objetos son elementos virtuales de OpoCompit. No tienen valor monetario, no pueden canjearse por dinero ni transferirse fuera del servicio.',
          'Si se habilitan compras o suscripciones en el futuro, se mostrarán precio, duración y condiciones antes de confirmar cualquier pago.',
        ],
      },
      {
        title: '6. Disponibilidad',
        paragraphs: [
          'Podemos realizar mantenimiento, corregir errores o modificar funciones para proteger y mejorar el servicio. Intentaremos preservar el progreso y comunicar cambios relevantes.',
        ],
      },
      {
        title: '7. Eliminación y cierre',
        paragraphs: [
          'Puedes eliminar tu cuenta y sus datos desde Ajustes. También puedes solicitar ayuda desde la ruta pública de eliminación indicada en Soporte.',
          'Podemos suspender cuentas que incumplan de forma grave estos términos, respetando los derechos que correspondan al usuario.',
        ],
      },
      {
        title: '8. Responsabilidad',
        paragraphs: [
          'OpoCompit complementa el estudio, pero no sustituye las bases, boletines, temarios ni comunicaciones oficiales. No respondemos de decisiones tomadas únicamente a partir de una pregunta de la aplicación.',
        ],
      },
      {
        title: '9. Legislación y cambios',
        paragraphs: [
          'Estos términos se interpretan conforme a la legislación española, sin limitar los derechos imperativos de consumidores y usuarios.',
          'La fecha de versión identifica el texto aplicable. Los cambios relevantes se comunicarán antes de entrar en vigor cuando resulte necesario.',
        ],
      },
    ],
  },
};
