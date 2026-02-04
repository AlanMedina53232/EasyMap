# DESIGN_LOG_3: Manejo de Estados de Carga y Error en la UI

**Fecha:** 3 de febrero, 2026  
**Autor:** Alan Medina  
**Objetivo:** Documentar la estrategia de UX para gestionar estados de carga y error durante la persistencia de puntos geográficos.

---

## 1. Contexto del Problema

En aplicaciones web modernas, especialmente aquellas que realizan operaciones asíncronas (como guardar datos en un servidor), es crucial proporcionar **feedback visual inmediato** al usuario. Sin esto, la experiencia se siente rota o no responsiva.

Para **EasyMap**, cuando un usuario hace clic en el mapa para guardar un punto, se ejecuta una petición `POST` asíncrona al servidor Flask. Durante este proceso pueden ocurrir varios estados:

1. **Estado de Carga:** La solicitud está en progreso
2. **Estado de Éxito:** El punto se guardó correctamente
3. **Estado de Error:** Falló la conexión o el servidor respondió con error

---

## 2. Solución Implementada: Sistema de Notificaciones Toast

### 2.1 Decisión de Diseño

En lugar de usar alerts intrusivos o modales bloqueantes, opté por un **sistema de notificaciones tipo "toast"** (notificaciones emergentes no-intrusivas) que:

- Aparecen en la parte inferior-central de la pantalla
- Son temporales (3 segundos)
- No bloquean la interacción con el mapa
- Tienen transiciones suaves (opacity fade-in/fade-out)
- Usan colores semánticos para diferenciar estados

### 2.2 Implementación Técnica

#### Función `showToast(message, isError)`

Ubicada en: [map-logic.js](static/components/map-logic.js#L35-L46)

```javascript
const showToast = (message, isError = false) => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[2000] 
                       px-6 py-3 rounded-full text-white text-sm font-bold 
                       shadow-2xl transition-all duration-500 
                       ${isError ? 'bg-red-500' : 'bg-zinc-800'}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};
```

**Características clave:**
- **Posicionamiento fijo:** `fixed bottom-20 left-1/2 transform -translate-x-1/2` → centrado horizontalmente en la parte inferior
- **Z-index elevado:** `z-[2000]` para aparecer sobre el mapa (que tiene z-index 10-1000)
- **Diseño adaptativo:** Color rojo para errores (`bg-red-500`), gris oscuro para información (`bg-zinc-800`)
- **Auto-destrucción:** Se desvanece después de 3 segundos y se elimina del DOM después de 3.5 segundos

---

## 3. Manejo de Estados en el Flujo de Guardado

### 3.1 Estado: CARGA (Loading)

**Cuándo:** Inmediatamente después de que el usuario confirme el guardado  
**Implementación:** [map-logic.js](static/components/map-logic.js#L51)

```javascript
const saveLocation = async (lat, lng) => {
    showToast("Guardando punto...");  // ← Estado de carga
    
    try {
        const response = await fetch('/guardar_punto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lng })
        });
        // ...
    }
}
```

**Ventajas:**
- Feedback inmediato (< 50ms después del clic)
- El usuario sabe que su acción fue reconocida
- Reduce la ansiedad de espera en conexiones lentas

### 3.2 Estado: ÉXITO (Success)

**Cuándo:** El servidor responde con `status 200 OK`  
**Implementación:** [map-logic.js](static/components/map-logic.js#L60-L63)

```javascript
if (response.ok) {
    showToast("¡Punto guardado con éxito!");
    if (tempMarker) tempMarker.closePopup();  // Cierra el popup de confirmación
}
```

**Detalles:**
- Mensaje afirmativo que confirma la acción
- El popup de confirmación se cierra automáticamente
- El marcador permanece en el mapa (indicador visual de persistencia)

### 3.3 Estado: ERROR (Error)

**Cuándo:** Falla la petición HTTP o el servidor devuelve error  
**Implementación:** [map-logic.js](static/components/map-logic.js#L64-L69)

```javascript
else {
    throw new Error("Error en el servidor");
}
} catch (error) {
    console.error(error);
    showToast("Error al conectar con el servidor", true);  // ← isError = true
}
```

**Características:**
- Toast rojo (`bg-red-500`) para máxima visibilidad
- Log del error en consola para debugging
- Mensaje genérico que no expone detalles técnicos al usuario
- El marcador y popup permanecen para permitir reintento

---

## 4. Experiencia de Usuario (UX Flow)

### Flujo completo de interacción:

1. **Usuario hace clic en el mapa**
   - Aparece marcador temporal inmediatamente
   - Se abre popup con botón "Confirmar"

2. **Usuario hace clic en "Confirmar"**
   - Toast gris: "Guardando punto..." (Estado: CARGA)
   - Petición HTTP POST en background

3. **Servidor responde exitosamente**
   - Toast gris: "¡Punto guardado con éxito!" (Estado: ÉXITO)
   - Popup se cierra automáticamente

4. **O servidor falla**
   - Toast rojo: "Error al conectar con el servidor" (Estado: ERROR)
   - Popup permanece abierto → usuario puede reintentar

---

## 5. Consideraciones de Accesibilidad

### Mejoras pendientes:
- [ ] Agregar `role="alert"` y `aria-live="polite"` a los toasts para lectores de pantalla
- [ ] Considerar soporte para `prefers-reduced-motion` para usuarios sensibles a animaciones
- [ ] Añadir opción de cerrar manualmente el toast (botón X)

### Código propuesto:
```javascript
toast.setAttribute('role', 'alert');
toast.setAttribute('aria-live', 'polite');
```

---

## 6. Ventajas del Enfoque Actual

1. **No-intrusivo:** No bloquea la UI ni requiere acción del usuario
2. **Visualmente consistente:** Usa TailwindCSS, coherente con el diseño general
3. **Performante:** No hay re-renders innecesarios, solo manipulación DOM directa
4. **Escalable:** Fácil agregar más tipos de toast (warning, info, etc.)

---

## 7. Alternativas Consideradas

### Opción A: Alerts nativos
```javascript
alert("Punto guardado con éxito");
```
**Rechazado:** Bloquea la UI, no es personalizable, mala UX

### Opción B: Modificar el texto del popup
```javascript
popup.setContent("✓ Punto guardado");
```
**Rechazado:** Requiere que el popup esté abierto, no maneja bien errores

### Opción C: Barra de estado fija
```html
<div id="status-bar">Estado: Guardando...</div>
```
**Rechazado:** Ocupa espacio permanente, menos llamativo

---

## 8. Lecciones Aprendidas

1. **El timing importa:** 3 segundos es el balance ideal entre visibilidad y no-molestia
2. **Los colores hablan:** Rojo para error es universal, gris es neutral y menos agresivo que verde
3. **Async/await simplifica el manejo de estados:** El código es lineal y fácil de seguir
4. **Siempre hacer logging:** `console.error(error)` es crucial para debugging en producción

---

## 9. Métricas de Éxito (a futuro)

Para validar que esta implementación funciona:
- **Tasa de reintento:** ¿Los usuarios intentan guardar de nuevo cuando hay error?
- **Tiempo de reacción:** ¿Los usuarios esperan o hacen doble clic?
- **Reportes de bugs:** ¿Los usuarios entienden qué pasó cuando hay error?

---

## Conclusión

El sistema de toast implementado en EasyMap proporciona un balance óptimo entre **feedback claro** y **no-intrusividad**. La arquitectura es lo suficientemente flexible para escalar a más tipos de notificaciones en el futuro (ej: "GPS desactivado", "Sin conexión", etc.).

La clave del éxito está en **mostrar algo inmediatamente** (estado de carga) y **ser honesto con el usuario** cuando algo falla (estado de error), sin bloquear su flujo de trabajo.
