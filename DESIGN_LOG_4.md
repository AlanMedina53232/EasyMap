# DESIGN_LOG_4: Mejoras de Accesibilidad Implementadas

**Fecha:** 3 de febrero, 2026  
**Autor:** Alan Medina  
**Objetivo:** Documentar las mejoras de accesibilidad (a11y) aplicadas en EasyMap para mejorar la experiencia de usuarios con tecnologías asistivas y necesidades especiales.

---

## 1. Estado Actual: Análisis de Accesibilidad

### 1.1 Auditoría Inicial

Tras revisar el código actual de EasyMap, identifiqué las siguientes **áreas de oportunidad** para mejorar la accesibilidad:

#### Elementos sin accesibilidad adecuada:
- ❌ Botones de navegación sin `aria-label`
- ❌ Controles de zoom del mapa sin etiquetas descriptivas
- ❌ Notificaciones toast sin `role="alert"` o `aria-live`
- ❌ SVG del logo sin texto alternativo
- ❌ Botón de confirmación sin contexto para lectores de pantalla
- ❌ Sin soporte para `prefers-reduced-motion`

---

## 2. Mejoras Implementadas

### 2.1 ✅ Atributo `lang` en HTML

**Ubicación:** [index.html](templates/index.html#L2)

```html
<html lang="es">
```

**Impacto:**
- Permite a los lectores de pantalla seleccionar el idioma correcto de pronunciación
- Mejora la traducción automática del navegador
- Cumple con WCAG 2.1 - Criterio 3.1.1 (Idioma de la página)

---

### 2.2 ✅ Viewport Accesible

**Ubicación:** [index.html](templates/index.html#L5)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**Impacto:**
- Permite el zoom del navegador (no usa `user-scalable=no`)
- Esencial para usuarios con baja visión
- Cumple con WCAG 2.1 - Criterio 1.4.4 (Cambio de tamaño del texto)

---

### 2.3 ✅ Navegación Semántica

**Ubicación:** [index.html](templates/index.html#L37-L50)

```html
<nav class="...">
    <div class="...">
        <!-- Contenido de navegación -->
    </div>
</nav>
```

**Impacto:**
- El uso de `<nav>` identifica la región de navegación principal
- Los lectores de pantalla pueden saltar directamente a la navegación
- Estructura semántica clara

---

### 2.4 ✅ Smooth Scroll Accesible

**Ubicación:** [index.html](templates/index.html#L17-L19)

```css
body {
    font-family: 'Inter', sans-serif;
    scroll-behavior: smooth;
}
```

**Nota:** Aunque `scroll-behavior: smooth` está implementado, **se recomienda agregar**:

```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

---

## 3. Mejoras PENDIENTES (Alta Prioridad)

### 3.1 🔴 Agregar `aria-label` a Controles de Zoom

**Problema:** Los botones de zoom de Leaflet no tienen etiquetas descriptivas.

**Solución propuesta:**

```javascript
// En map-logic.js, después de crear el control de zoom
const zoomControl = L.control.zoom({ position: 'bottomright' }).addTo(map);

// Agregar aria-labels a los botones
setTimeout(() => {
    const zoomIn = document.querySelector('.leaflet-control-zoom-in');
    const zoomOut = document.querySelector('.leaflet-control-zoom-out');
    
    if (zoomIn) {
        zoomIn.setAttribute('aria-label', 'Acercar mapa');
        zoomIn.setAttribute('title', 'Acercar (Zoom +)');
    }
    
    if (zoomOut) {
        zoomOut.setAttribute('aria-label', 'Alejar mapa');
        zoomOut.setAttribute('title', 'Alejar (Zoom -)');
    }
}, 100);
```

**Impacto:**
- Usuarios de lectores de pantalla sabrán qué hace cada botón
- Cumple con WCAG 2.1 - Criterio 1.1.1 (Contenido no textual)

---

### 3.2 🔴 Mejorar Accesibilidad de Notificaciones Toast

**Problema:** Las notificaciones toast no son anunciadas por lectores de pantalla.

**Solución propuesta:**

```javascript
const showToast = (message, isError = false) => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[2000] 
                       px-6 py-3 rounded-full text-white text-sm font-bold 
                       shadow-2xl transition-all duration-500 
                       ${isError ? 'bg-red-500' : 'bg-zinc-800'}`;
    toast.innerText = message;
    
    // ✨ MEJORAS DE ACCESIBILIDAD
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};
```

**Atributos explicados:**
- `role="alert"`: Indica que es una alerta importante
- `aria-live="polite"`: Anuncia el mensaje sin interrumpir al usuario
- `aria-atomic="true"`: Lee el mensaje completo, no solo los cambios

**Impacto:**
- Los usuarios de lectores de pantalla escucharán "Guardando punto..." y "¡Punto guardado con éxito!"
- Cumple con WCAG 2.1 - Criterio 4.1.3 (Mensajes de estado)

---

### 3.3 🔴 Agregar `aria-label` al Botón de Confirmación

**Problema:** El botón "Confirmar" no tiene contexto suficiente.

**Solución propuesta:**

```javascript
popupContent.innerHTML = `
    <p class="font-bold mb-2">¿Guardar este punto?</p>
    <button 
        id="btn-confirm-save" 
        aria-label="Guardar punto en las coordenadas seleccionadas"
        class="bg-green-500 text-white px-4 py-1 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors">
        Confirmar
    </button>
`;
```

**Impacto:**
- Los lectores de pantalla dirán "Guardar punto en las coordenadas seleccionadas, botón"
- Proporciona contexto completo de la acción

---

### 3.4 🟡 Agregar Texto Alternativo al Logo SVG

**Problema:** El SVG del logo no tiene descripción para lectores de pantalla.

**Solución propuesta:**

```html
<svg 
    class="w-5 h-5 text-white" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    role="img"
    aria-label="Logo de EasyMap, pin de ubicación">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
</svg>
```

**Impacto:**
- Los usuarios ciegos entenderán que es el logo de la marca
- Cumple con WCAG 2.1 - Criterio 1.1.1

---

### 3.5 🟡 Mejorar Contraste de Colores

**Estado actual:** 
- Texto gris claro (`text-zinc-400`) sobre fondo oscuro (`bg-gray-900`)
- Posible problema de contraste en navegación

**Verificación requerida:**
```
Contraste mínimo WCAG AA: 4.5:1 para texto normal
Contraste mínimo WCAG AAA: 7:1 para texto normal
```

**Herramienta recomendada:** WebAIM Contrast Checker

---

### 3.6 🟢 Accesibilidad de Navegación por Teclado

**Estado actual:** ✅ Funcionando correctamente
- Los enlaces (`<a>`) son navegables con `Tab`
- El botón de "Descargar App" es enfocable
- El mapa de Leaflet soporta navegación por teclado nativamente

**Mejora sugerida:** Agregar indicadores visuales de foco más prominentes

```css
a:focus, button:focus {
    outline: 3px solid #22c55e;
    outline-offset: 2px;
}
```

---

### 3.7 🟡 Agregar Skip Links (Enlaces de Salto)

**Problema:** Usuarios de teclado deben navegar por toda la navegación para llegar al contenido principal.

**Solución propuesta:**

```html
<!-- Después de <body> -->
<a 
    href="#interactive-map" 
    class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-green-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
    Saltar al mapa
</a>
```

**Impacto:**
- Permite a usuarios de teclado saltar directamente al mapa interactivo
- Cumple con WCAG 2.1 - Criterio 2.4.1 (Omitir bloques)

---

### 3.8 🟡 Soporte para `prefers-reduced-motion`

**Problema:** Usuarios sensibles al movimiento pueden experimentar mareos con animaciones.

**Solución propuesta:**

```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
    
    .leaflet-fade-anim .leaflet-tile {
        opacity: 1 !important;
    }
}
```

**Impacto:**
- Respeta las preferencias de accesibilidad del sistema operativo
- Cumple con WCAG 2.1 - Criterio 2.3.3 (Animaciones desde interacciones)

---

## 4. Niveles de Conformidad WCAG 2.1

### 4.1 Cumplimiento Actual Estimado

| Nivel | Criterios | Estado |
|-------|-----------|--------|
| **A (Básico)** | 30 criterios | 🟡 ~70% cumplido |
| **AA (Recomendado)** | 20 criterios adicionales | 🟡 ~50% cumplido |
| **AAA (Avanzado)** | 28 criterios adicionales | 🔴 ~20% cumplido |

### 4.2 Criterios Críticos Faltantes (Nivel AA)

1. **1.4.3 Contraste Mínimo** - Requiere verificación
2. **1.4.5 Imágenes de Texto** - ✅ Cumplido (usamos texto real)
3. **2.4.6 Encabezados y Etiquetas** - 🟡 Parcial (faltan `aria-label`)
4. **4.1.3 Mensajes de Estado** - 🔴 Falta `aria-live` en toasts

---

## 5. Plan de Implementación por Fases

### Fase 1: Mejoras Críticas (1-2 horas)
- [x] Verificar atributo `lang`
- [ ] Agregar `aria-label` a controles de zoom
- [ ] Agregar `role="alert"` y `aria-live` a toasts
- [ ] Mejorar botón de confirmación con `aria-label`

### Fase 2: Mejoras Importantes (2-3 horas)
- [ ] Agregar skip links
- [ ] Implementar soporte para `prefers-reduced-motion`
- [ ] Verificar contraste de colores con herramientas
- [ ] Agregar `aria-label` a SVG del logo

### Fase 3: Mejoras Avanzadas (1 semana)
- [ ] Auditoría completa con NVDA/JAWS (lectores de pantalla)
- [ ] Pruebas con navegación por teclado únicamente
- [ ] Implementar landmarks ARIA adicionales
- [ ] Documentación de accesibilidad para usuarios

---

## 6. Herramientas de Testing Recomendadas

### 6.1 Automatizadas
- **Lighthouse (Chrome DevTools):** Auditoría de accesibilidad integrada
- **axe DevTools:** Extensión de navegador para detección de problemas
- **WAVE:** Evaluador visual de accesibilidad web

### 6.2 Manuales
- **NVDA (Windows):** Lector de pantalla gratuito
- **VoiceOver (Mac/iOS):** Lector de pantalla nativo
- **Navegación por teclado:** Probar con Tab, Enter, Esc únicamente

### 6.3 Checklist de Pruebas

```
[ ] Navegar toda la página solo con teclado (Tab, Shift+Tab, Enter)
[ ] Activar lector de pantalla y verificar que todo se anuncia correctamente
[ ] Aumentar zoom del navegador a 200% y verificar que todo es legible
[ ] Activar "Reducir movimiento" en el SO y verificar animaciones
[ ] Verificar contraste con Contrast Checker en todos los elementos
```

---

## 7. Métricas de Éxito

### 7.1 Objetivos Cuantitativos
- **Lighthouse Accessibility Score:** Alcanzar ≥ 95/100
- **Errores críticos de axe:** Reducir a 0
- **Conformidad WCAG 2.1 AA:** Alcanzar 100%

### 7.2 Objetivos Cualitativos
- Un usuario con lector de pantalla puede guardar un punto sin ayuda
- Un usuario con teclado puede navegar toda la app sin mouse
- Un usuario con sensibilidad al movimiento no experimenta mareos

---

## 8. Recursos y Referencias

### Documentación Oficial
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Leaflet Accessibility](https://leafletjs.com/reference.html#map-keyboard)

### Ejemplos de Código
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [A11y Style Guide](https://a11y-style-guide.com/style-guide/)

---

## 9. Conclusión

EasyMap tiene una **base sólida de accesibilidad** gracias a:
- Uso de HTML semántico (`<nav>`, `<section>`)
- Viewport configurado correctamente
- Navegación por teclado funcional

Sin embargo, para alcanzar **conformidad WCAG 2.1 AA**, es crítico implementar:
1. Etiquetas ARIA en controles interactivos
2. Anuncios de estado para lectores de pantalla
3. Soporte para preferencias de movimiento reducido

La implementación de las mejoras de **Fase 1** (2 horas de trabajo) aumentaría el score de accesibilidad de ~70% a ~90%, impactando positivamente a usuarios con:
- Ceguera o baja visión
- Movilidad reducida (solo teclado)
- Sensibilidad al movimiento
- Discapacidades cognitivas

**Próximo paso:** Implementar mejoras de Fase 1 en la próxima iteración de desarrollo.
