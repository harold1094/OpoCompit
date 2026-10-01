# Avance automático del cuestionario

## Objetivo

Simplificar la respuesta de los cuestionarios: una sola pulsación sobre una opción debe registrar la respuesta y avanzar a la siguiente pregunta. El usuario no podrá dejar preguntas en blanco ni regresar a preguntas anteriores.

## Alcance

El comportamiento se aplicará a todos los modos que utilizan la pantalla compartida de cuestionario:

- partida rápida;
- duelo clásico;
- duelo entre amigos;
- duelo competitivo.

El botón para abandonar la partida se mantiene. Abandonar la partida no equivale a retroceder a una pregunta anterior.

## Interacción

1. La pantalla muestra una pregunta y sus opciones.
2. Al pulsar una opción, la aplicación registra esa respuesta una sola vez.
3. Si quedan preguntas, avanza inmediatamente a la siguiente.
4. Si es la última pregunta, envía y finaliza la partida automáticamente.
5. Mientras se procesa la pulsación o se envía la partida, las opciones quedan bloqueadas para impedir respuestas duplicadas.

Se eliminan de la pantalla:

- la acción «Dejar en blanco»;
- el botón «Siguiente»;
- el botón «Terminar partida».

## Datos y puntuación

No cambian las reglas de puntuación ni el contrato con Firebase. Cada pregunta completada desde este flujo tendrá una respuesta seleccionada. La compatibilidad interna con respuestas en blanco puede conservarse para sesiones antiguas, datos remotos o futuros modos que la necesiten, pero la interfaz de este cuestionario no permitirá generarlas.

## Errores

Si falla el envío de la última respuesta, la pantalla permanece en la última pregunta, vuelve a habilitar las opciones y muestra el error existente. El usuario podrá reintentar seleccionando una opción.

## Pruebas

Las pruebas verificarán:

- que una respuesta intermedia se registra y conduce a la pregunta siguiente;
- que la última respuesta inicia la finalización automática;
- que no existe una acción para dejar la pregunta en blanco;
- que el estado de procesamiento impide pulsaciones repetidas;
- que las pruebas y la comprobación de tipos existentes continúan pasando.
