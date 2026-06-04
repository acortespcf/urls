# Datasources de landings

Este repositorio guarda archivos de texto con la estructura de datasources para landings y campañas.

## Formato esperado

Cada bloque parte con la ruta de la landing y su identificador:

```text
/cyber/computacion-y-gamerzone
1946 /cyber-computacion-y-gamerzone
```

Luego cada ítem debe quedar con este formato:

```text
<Titulo>
<datasource>
<orden>
```

Ejemplo:

```text
Notebooks
notebooks
2
```

## Reglas para los datasource

- El título se mantiene igual.
- El datasource debe ser único y no debe chocar con otros nombres parecidos.
- Se prefieren abreviaciones cortas y sin espacios.
- Si dos categorías son similares, el datasource debe hacer explícita la diferencia.
- Dentro de una misma sección, evita que dos datasources partan con las mismas dos letras.

Ejemplos:

- `Notebooks` -> `notebooks`
- `Notebooks Gamer` -> `gmrbks`
- `Monitores` -> `mntrs`
- `Monitores Gamer` -> `gmrntrs`

## Orden

- Bajo cada datasource debe existir una línea con el orden.
- La numeración parte en `1` dentro de cada sección.
- Cada nueva sección reinicia la numeración.

## Importar desde planilla CSV

Si la estructura viene desde Google Sheets, exporta la pestaña como CSV y usa el helper del skill:

```bash
node ".opencode/skills/datasource-normalizer/scripts/csv-to-datasource.js" "datas/mis datas - dia-del-padre.csv" --output "datas/dia-del-padre.txt"
```

Qué hace:

- detecta URLs por columna
- arma una sección por landing
- genera el slug desde la URL
- crea datasources abreviados y únicos por sección
- evita que dos datasources de una misma sección arranquen con el mismo prefijo de dos letras cuando hay alternativa mejor
- agrega el orden secuencial
- si no le das ids reales, deja `TODO /slug` como placeholder visible

Regla de naming usada por el helper:

- si el título es simple, prioriza un nombre legible
- si hay otro título muy parecido, empuja al frente el término distintivo
- ejemplo: `Notebooks` -> `notebooks`, `Notebooks Gamer` -> `gmrbks`

Opcionalmente puedes asignar ids correlativos de borrador:

```bash
node ".opencode/skills/datasource-normalizer/scripts/csv-to-datasource.js" "datas/mis datas - dia-del-padre.csv" --output "datas/dia-del-padre.txt" --start-id 3000
```

## Skill reutilizable

Se agregó el skill local `.opencode/skills/datasource-normalizer/SKILL.md` para reutilizar este flujo en OpenCode.

El skill sirve para:

- normalizar datasource en archivos `datas/*.txt`
- generar borradores `datas/*.txt` desde planillas `datas/*.csv`
- mantener intactos los títulos
- agregar o corregir el orden por sección
- reparar pequeños desfases de formato si el archivo quedó corrido
- evitar colisiones por prefijo de dos letras dentro de la misma sección

## Cómo usar el skill

1. Reinicia OpenCode para que cargue el nuevo skill.
2. Pide una edición sobre un archivo de `datas`, por ejemplo:

```text
Normaliza los datasource de `datas/cyber-2026.txt`, manteniendo los títulos y agregando el orden por sección.
```

o bien:

```text
Genera `datas/dia-del-padre.txt` a partir de `datas/mis datas - dia-del-padre.csv` y normaliza los datasource.
```

3. OpenCode aplicará estas reglas:

- conserva el título
- corrige o reemplaza el datasource
- agrega la línea de orden
- reinicia el conteo en cada bloque de landing
