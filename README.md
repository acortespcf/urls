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
ntbks
2
```

## Reglas para los datasource

- El título se mantiene igual.
- El datasource debe ser único y no debe chocar con otros nombres parecidos.
- Se prefieren abreviaciones cortas y sin espacios.
- Si dos categorías son similares, el datasource debe hacer explícita la diferencia.

Ejemplos:

- `Notebooks` -> `ntbks`
- `Notebooks Gamer` -> `ntbksgmr`
- `Monitores` -> `mntrs`
- `Monitores Gamer` -> `mntrsgmr`

## Orden

- Bajo cada datasource debe existir una línea con el orden.
- La numeración parte en `1` dentro de cada sección.
- Cada nueva sección reinicia la numeración.

## Skill reutilizable

Se agregó el skill local `.opencode/skills/datasource-normalizer/SKILL.md` para reutilizar este flujo en OpenCode.

El skill sirve para:

- normalizar datasource en archivos `datas/*.txt`
- mantener intactos los títulos
- agregar o corregir el orden por sección
- reparar pequeños desfases de formato si el archivo quedó corrido

## Cómo usar el skill

1. Reinicia OpenCode para que cargue el nuevo skill.
2. Pide una edición sobre un archivo de `datas`, por ejemplo:

```text
Normaliza los datasource de `datas/cyber-2026.txt`, manteniendo los títulos y agregando el orden por sección.
```

3. OpenCode aplicará estas reglas:

- conserva el título
- corrige o reemplaza el datasource
- agrega la línea de orden
- reinicia el conteo en cada bloque de landing
