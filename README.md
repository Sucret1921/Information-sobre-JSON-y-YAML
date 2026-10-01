# Guía JSON & YAML

![Estado](https://img.shields.io/badge/estado-Gu%C3%ADa%20Avanzada%20Finalizada-34d399?style=flat-square)
![Versión](https://img.shields.io/badge/versi%C3%B3n-2.0.0-7c6cff?style=flat-square)
![Dependencias](https://img.shields.io/badge/dependencias-0-38bdf8?style=flat-square)

> **Estado: Guía Avanzada Finalizada**

Guía avanzada e interactiva sobre **JSON** y **YAML**, implementada por completo, optimizada y finalizada. Reúne en una experiencia web moderna la teoría esencial de ambos formatos (historia, colecciones, reglas sintácticas, tipos de datos y ejemplos prácticos), una comparativa visual, un conversor JSON → YAML en tiempo real con validación, un quiz de autoevaluación y una referencia rápida. El diseño premium, accesible y responsive se rige por un sistema de diseño declarado en YAML.

**Para verla:** abre `index.html` en el navegador, publícala con GitHub Pages (rama + carpeta raíz) o ejecuta `npm start` y visita <http://localhost:8000>.

---

**ÍNDICE**
1. [YAML](#yaml)
2. [JSON](#json)
3. [YAML vs JSON](#yaml-vs-json)
4. [Estructura del proyecto](#estructura-del-proyecto)

## YAML

YAML (*YAML Ain't Markup Language*) es un formato de texto pensado para la serialización de datos, propuesto como alternativa a XML. Su sintaxis combina conceptos de varios lenguajes (HTML, C, Perl y Python).

El formato YAML fue propuesto por Clark Evans a principios de 2001 y se dio a conocer a través de su página web <https://yaml.org/>. YAML no se ha publicado como norma por ningún organismo de normalización.

Las tres versiones publicadas:

- enero de 2004: YAML 1.0
- diciembre de 2004: YAML 1.1
- octubre de 2009: YAML 1.2

![YAML IMAGEN](https://uxwing.com/wp-content/themes/uxwing/download/file-and-folder-type/yaml-file-icon.png)

### Colecciones

Las colecciones de bloques de YAML utilizan la sangría para definir el alcance y comienzan cada entrada en su propia línea. Las secuencias de bloques indican cada entrada con un guion y un espacio (`- `). Los mapas utilizan dos puntos y un espacio (`: `) para marcar cada par clave/valor. Los comentarios comienzan con un octothorpe (también llamado *hash*, *sharp*, *libra* o *signo numérico*: `#`).

```yaml
- Mark McGwire
- Sammy Sosa
- Ken Griffey
```

```yaml
hr:  65    # Home runs
avg: 0.278 # Batting average
rbi: 147   # Runs Batted In
```

## JSON

JavaScript Object Notation (JSON) es el formato de intercambio de datos que hace posible la comunicación entre aplicaciones en la web. Se ha convertido en un formato muy popular entre los desarrolladores gracias a su texto legible por humanos, ligero, que requiere menos codificación y se procesa rápidamente.

![imagen](https://github.com/Sucret1921/JSONYAMAL/assets/153021297/664dda6b-0760-40a1-8721-3130db03356c)

Las reglas sintácticas de JSON son bastante sencillas:

- En JSON existen dos tipos de elementos:
  - **Matrices (arrays):** listas de valores separados por comas. Se escriben entre corchetes `[ ]`.
  - **Objetos (objects):** listas de parejas nombre/valor. El nombre y el valor se separan con dos puntos `:` y las parejas, con comas. Los objetos se escriben entre llaves `{ }` y los nombres de las parejas van siempre entre comillas dobles.
- Los espacios en blanco y los saltos de línea no son significativos, es decir, puede haber cualquier número de espacios en blanco o saltos de línea separando cualquier elemento o símbolo del documento.

Ejemplos prácticos de los puntos anteriores:

```json
[1, "pepe", 3.14, "Pepito Conejo"]
```

```json
{"nombre": "Pepito Conejo", "edad": 25, "carnet de conducir": true}
```

```json
[
  {
    "nombre": "Pepito Conejo",
    "edad": 25,
    "carnet de conducir": true
  },
  {
    "nombre": "Ana Barberá",
    "edad": 90,
    "carnet de conducir": false
  }
]
```

## YAML vs JSON

| Característica      | YAML                         | JSON                       |
| ------------------- | ---------------------------- | -------------------------- |
| Estructura          | Sangría                      | Llaves y corchetes         |
| Comentarios         | Sí (`#`)                     | No                         |
| Comillas en claves  | Opcionales                   | Obligatorias (dobles)      |
| Uso típico          | Configuración (Compose, K8s) | APIs e intercambio de datos |

## Estructura del proyecto

```
├── index.html                 # Página de la guía (HTML semántico y accesible)
├── design/design-system.yaml  # Fuente de verdad: tokens, componentes y motion
├── assets/css/tokens.css      # Tokens de diseño (espejo del YAML, tema claro/oscuro)
├── assets/css/main.css        # Componentes, layout, animaciones y responsive
├── assets/js/lib/highlight.js # Resaltado de sintaxis JSON/YAML
├── assets/js/lib/convert.js   # Conversor JSON → YAML y diagnóstico de errores
├── assets/js/app.js           # Navegación, playground, quiz, paleta de comandos…
└── tests/                     # Pruebas con node:test (npm test)
```

Sin dependencias ni paso de compilación. Ejecuta `npm test` para validar el conversor, el resaltado y la sincronización de tokens con `design/design-system.yaml`.
