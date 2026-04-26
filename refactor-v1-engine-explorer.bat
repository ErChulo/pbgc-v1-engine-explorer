@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==============================================================================
REM  refactor-v1-engine-explorer.bat
REM
REM  Purpose:
REM    Refactor the current V1 Engine Explorer working directory into the proposed
REM    repository architecture.
REM
REM  How to use:
REM    1. Put this .bat file in the repository root:
REM         pbgc-v1-engine-explorer\
REM    2. Open Command Prompt in that folder.
REM    3. Run:
REM         refactor-v1-engine-explorer.bat
REM
REM  Behavior:
REM    - Creates the target folder structure.
REM    - Moves known current files into the new folders.
REM    - Renames selected .txt VBA modules to .bas.
REM    - Creates .gitkeep files for empty folders.
REM    - Creates README.md, CHANGELOG.md, .gitignore, and initial documentation files
REM      only if they do not already exist.
REM    - Does NOT commit automatically.
REM ==============================================================================

echo.
echo ============================================================
echo  PBGC V1 Engine Explorer - Repository Refactor
echo ============================================================
echo.

REM ------------------------------------------------------------------------------
REM 1. Create folders
REM ------------------------------------------------------------------------------

echo Creating folder structure...

mkdir "docs\architecture" 2>nul
mkdir "docs\domain" 2>nul
mkdir "docs\workflows" 2>nul
mkdir "docs\decisions" 2>nul
mkdir "docs\examples" 2>nul

mkdir "src\app" 2>nul
mkdir "src\domain\engine" 2>nul
mkdir "src\domain\formulas" 2>nul
mkdir "src\domain\graph" 2>nul
mkdir "src\features\ingest" 2>nul
mkdir "src\features\dependency-explorer" 2>nul
mkdir "src\features\engine-comparison" 2>nul
mkdir "src\features\reports" 2>nul
mkdir "src\features\engine-database" 2>nul
mkdir "src\features\case-complexity-log" 2>nul
mkdir "src\infrastructure\excel" 2>nul
mkdir "src\infrastructure\db" 2>nul
mkdir "src\infrastructure\workers" 2>nul
mkdir "src\ui\components" 2>nul
mkdir "src\ui\panels" 2>nul
mkdir "src\ui\styles" 2>nul
mkdir "src\assets" 2>nul

mkdir "tools\excel" 2>nul
mkdir "tools\vba\v1-summary-export" 2>nul
mkdir "tools\vba\v1-preparation\functions" 2>nul
mkdir "tools\vba\v1-preparation\subs" 2>nul
mkdir "tools\vba\v1-preparation\utilities" 2>nul
mkdir "tools\vba\v1-preparation\misc" 2>nul

mkdir "data\reference" 2>nul
mkdir "data\samples" 2>nul
mkdir "data\private" 2>nul

mkdir "tests\fixtures\engines" 2>nul
mkdir "tests\fixtures\formulas" 2>nul
mkdir "tests\unit" 2>nul
mkdir "tests\integration" 2>nul

mkdir "scripts\dev" 2>nul
mkdir "scripts\ingest" 2>nul
mkdir "scripts\release" 2>nul

mkdir "legacy\html-prototypes" 2>nul

mkdir "output\reports" 2>nul
mkdir "output\exports" 2>nul
mkdir "output\logs" 2>nul

echo.> "data\private\.gitkeep"
echo.> "output\reports\.gitkeep"
echo.> "output\exports\.gitkeep"
echo.> "output\logs\.gitkeep"

echo Folder structure created.
echo.

REM ------------------------------------------------------------------------------
REM 2. Helper routine
REM ------------------------------------------------------------------------------

goto :main

:MoveFile
REM Args:
REM   %~1 = source path
REM   %~2 = destination path
set "SRC=%~1"
set "DST=%~2"

if exist "%SRC%" (
    for %%D in ("%DST%") do (
        if not exist "%%~dpD" mkdir "%%~dpD" 2>nul
    )

    if exist "%DST%" (
        echo SKIP: Destination already exists: "%DST%"
    ) else (
        move "%SRC%" "%DST%" >nul
        if errorlevel 1 (
            echo ERROR: Could not move "%SRC%" to "%DST%"
        ) else (
            echo MOVED: "%SRC%" ^> "%DST%"
        )
    )
) else (
    echo SKIP: Source not found: "%SRC%"
)
exit /b 0

:main

REM ------------------------------------------------------------------------------
REM 3. Move top-level files
REM ------------------------------------------------------------------------------

echo Moving top-level files...

call :MoveFile "DD-no-UDFs-subsets-indicators.csv" "data\reference\dd-no-udfs-subsets-indicators.csv"
call :MoveFile "folder_structure.txt" "docs\architecture\current-folder-structure.txt"
call :MoveFile "folder_tree.bat" "scripts\dev\folder-tree.bat"
call :MoveFile "modV1SummaryExport.txt" "tools\vba\v1-summary-export\modV1SummaryExport.bas"

call :MoveFile "v1-engine-formula-explorer-v2.6.8.5.html" "legacy\html-prototypes\v1-engine-formula-explorer-v2.6.8.5.html"
call :MoveFile "v1-engine-formula-explorer-v2.7.0.html" "legacy\html-prototypes\v1-engine-formula-explorer-v2.7.0.html"

call :MoveFile "v1-summary.xlsm" "tools\excel\v1-summary.xlsm"
call :MoveFile "V1Summary.json" "data\samples\v1summary.sample.json"

echo.

REM ------------------------------------------------------------------------------
REM 4. Move VBA preparation scripts
REM ------------------------------------------------------------------------------

echo Moving VBA preparation scripts...

if exist "v1-preparation-scripts" (
    call :MoveFile "v1-preparation-scripts\VBA - Function Arguments.txt" "tools\vba\v1-preparation\functions\arguments.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Function BasicFormulaTree.txt" "tools\vba\v1-preparation\functions\basic-formula-tree.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Function CellReflist.txt" "tools\vba\v1-preparation\functions\cell-ref-list.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Function ExtractCellRefs.txt" "tools\vba\v1-preparation\functions\extract-cell-refs.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Function GetNameRefersTo.txt" "tools\vba\v1-preparation\functions\get-name-refers-to.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Function HasSubstring.txt" "tools\vba\v1-preparation\functions\has-substring.bas"

    call :MoveFile "v1-preparation-scripts\VBA - Sub CalcularMatrizDistanciasPonderadas.txt" "tools\vba\v1-preparation\subs\calcular-matriz-distancias-ponderadas.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub CellInformationFlow.txt" "tools\vba\v1-preparation\subs\cell-information-flow.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub Find_Links.txt" "tools\vba\v1-preparation\subs\find-links.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub GetAllNamedRanges.txt" "tools\vba\v1-preparation\subs\get-all-named-ranges.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub Grafo_prueba.txt" "tools\vba\v1-preparation\subs\grafo-prueba.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub ListAllDependents.txt" "tools\vba\v1-preparation\subs\list-all-dependents.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub ListAllFormulas.txt" "tools\vba\v1-preparation\subs\list-all-formulas.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub ListAllPrecedents.txt" "tools\vba\v1-preparation\subs\list-all-precedents.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub ListDirectDependents.txt" "tools\vba\v1-preparation\subs\list-direct-dependents.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub ListDirectPrecedents.txt" "tools\vba\v1-preparation\subs\list-direct-precedents.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub ListFormulas.txt" "tools\vba\v1-preparation\subs\list-formulas.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub LlenarPrecedentesVacios.txt" "tools\vba\v1-preparation\subs\llenar-precedentes-vacios.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub MakeListOfNamedRanges.txt" "tools\vba\v1-preparation\subs\make-list-of-named-ranges.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub ReadFormulas.txt" "tools\vba\v1-preparation\subs\read-formulas.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub Reporte_Formulas_V1 (en progreso).txt" "tools\vba\v1-preparation\subs\reporte-formulas-v1-en-progreso.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub Summary_All_Worksheets_With_Formulas.txt" "tools\vba\v1-preparation\subs\summary-all-worksheets-with-formulas.bas"

    call :MoveFile "v1-preparation-scripts\VBA - Sub RemoveCarriageReturns.txt" "tools\vba\v1-preparation\utilities\remove-carriage-returns.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub RemoveIndentation.txt" "tools\vba\v1-preparation\utilities\remove-indentation.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub Replace_Blank_With_Text.txt" "tools\vba\v1-preparation\utilities\replace-blank-with-text.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub ReversePivotTable.txt" "tools\vba\v1-preparation\utilities\reverse-pivot-table.bas"
    call :MoveFile "v1-preparation-scripts\VBA - Sub StackColumns.txt" "tools\vba\v1-preparation\utilities\stack-columns.bas"

    REM Move any leftovers into misc, preserving original names.
    for %%F in ("v1-preparation-scripts\*") do (
        if exist "%%~fF" (
            if not exist "tools\vba\v1-preparation\misc\%%~nxF" (
                move "%%~fF" "tools\vba\v1-preparation\misc\%%~nxF" >nul
                echo MOVED leftover: "%%~nxF" ^> "tools\vba\v1-preparation\misc"
            )
        )
    )

    rmdir "v1-preparation-scripts" 2>nul
) else (
    echo SKIP: v1-preparation-scripts folder not found.
)

echo.

REM ------------------------------------------------------------------------------
REM 5. Create source placeholders
REM ------------------------------------------------------------------------------

echo Creating source placeholders...

if not exist "src\app\main.js" echo // Application entry point> "src\app\main.js"
if not exist "src\app\app-state.js" echo // Shared application state> "src\app\app-state.js"
if not exist "src\app\router.js" echo // UI routing / panel switching> "src\app\router.js"

if not exist "src\domain\engine\engine-model.js" echo // Canonical V1 engine model> "src\domain\engine\engine-model.js"
if not exist "src\domain\engine\workbook-model.js" echo // Workbook model> "src\domain\engine\workbook-model.js"
if not exist "src\domain\engine\worksheet-model.js" echo // Worksheet model> "src\domain\engine\worksheet-model.js"
if not exist "src\domain\engine\cell-model.js" echo // Cell model> "src\domain\engine\cell-model.js"
if not exist "src\domain\engine\formula-model.js" echo // Formula model> "src\domain\engine\formula-model.js"
if not exist "src\domain\engine\feature-vector.js" echo // Engine feature vector> "src\domain\engine\feature-vector.js"

if not exist "src\domain\formulas\formula-parser.js" echo // Formula parser> "src\domain\formulas\formula-parser.js"
if not exist "src\domain\formulas\formula-normalizer.js" echo // Formula normalizer> "src\domain\formulas\formula-normalizer.js"
if not exist "src\domain\formulas\reference-extractor.js" echo // Formula reference extractor> "src\domain\formulas\reference-extractor.js"
if not exist "src\domain\formulas\function-registry.js" echo // Excel and ATPBGC function registry> "src\domain\formulas\function-registry.js"

if not exist "src\domain\graph\dependency-graph.js" echo // Dependency graph builder> "src\domain\graph\dependency-graph.js"
if not exist "src\domain\graph\graph-metrics.js" echo // Graph metrics> "src\domain\graph\graph-metrics.js"
if not exist "src\domain\graph\graph-serialization.js" echo // Graph serialization> "src\domain\graph\graph-serialization.js"

if not exist "src\features\ingest\import-v1summary-json.js" echo // Import V1Summary JSON> "src\features\ingest\import-v1summary-json.js"
if not exist "src\features\ingest\import-dd-csv.js" echo // Import data dictionary CSV> "src\features\ingest\import-dd-csv.js"
if not exist "src\features\ingest\validate-engine-input.js" echo // Validate engine input artifacts> "src\features\ingest\validate-engine-input.js"

if not exist "src\features\dependency-explorer\dependency-view.js" echo // Dependency graph view> "src\features\dependency-explorer\dependency-view.js"
if not exist "src\features\dependency-explorer\neighborhood-view.js" echo // Local cell neighborhood view> "src\features\dependency-explorer\neighborhood-view.js"
if not exist "src\features\dependency-explorer\worksheet-map-view.js" echo // Worksheet map view> "src\features\dependency-explorer\worksheet-map-view.js"

if not exist "src\features\engine-comparison\compare-engines.js" echo // Engine comparison orchestration> "src\features\engine-comparison\compare-engines.js"
if not exist "src\features\engine-comparison\distance-metrics.js" echo // Distance metrics> "src\features\engine-comparison\distance-metrics.js"
if not exist "src\features\engine-comparison\similarity-score.js" echo // Similarity score> "src\features\engine-comparison\similarity-score.js"
if not exist "src\features\engine-comparison\distance-matrix.js" echo // Distance matrix> "src\features\engine-comparison\distance-matrix.js"

if not exist "src\features\reports\single-engine-report.js" echo // Single-engine report> "src\features\reports\single-engine-report.js"
if not exist "src\features\reports\group-engine-report.js" echo // Group-engine report> "src\features\reports\group-engine-report.js"
if not exist "src\features\reports\report-renderer.js" echo // Report renderer> "src\features\reports\report-renderer.js"

if not exist "src\features\engine-database\db.js" echo // Database configuration> "src\features\engine-database\db.js"
if not exist "src\features\engine-database\engine-repository.js" echo // Engine repository abstraction> "src\features\engine-database\engine-repository.js"
if not exist "src\features\engine-database\schema-versioning.js" echo // Database schema versioning> "src\features\engine-database\schema-versioning.js"
if not exist "src\features\engine-database\migrations.js" echo // Database migrations> "src\features\engine-database\migrations.js"

if not exist "src\features\case-complexity-log\case-complexity-features.js" echo // Case complexity feature definitions> "src\features\case-complexity-log\case-complexity-features.js"
if not exist "src\features\case-complexity-log\case-complexity-log.js" echo // Case complexity log builder> "src\features\case-complexity-log\case-complexity-log.js"
if not exist "src\features\case-complexity-log\export-case-complexity-log.js" echo // Excel export for Case_Complexity_Log.xlsx> "src\features\case-complexity-log\export-case-complexity-log.js"

if not exist "src\infrastructure\excel\xlsx-exporter.js" echo // XLSX export adapter> "src\infrastructure\excel\xlsx-exporter.js"
if not exist "src\infrastructure\excel\workbook-writer.js" echo // Workbook writer> "src\infrastructure\excel\workbook-writer.js"
if not exist "src\infrastructure\db\dexie-adapter.js" echo // Dexie / IndexedDB adapter> "src\infrastructure\db\dexie-adapter.js"
if not exist "src\infrastructure\db\sqlite-adapter.js" echo // SQLite adapter placeholder> "src\infrastructure\db\sqlite-adapter.js"
if not exist "src\infrastructure\workers\formula-worker.js" echo // Formula worker> "src\infrastructure\workers\formula-worker.js"
if not exist "src\infrastructure\workers\comparison-worker.js" echo // Comparison worker> "src\infrastructure\workers\comparison-worker.js"

echo Source placeholders created.
echo.

REM ------------------------------------------------------------------------------
REM 6. Create root documentation / config files if missing
REM ------------------------------------------------------------------------------

echo Creating root documentation and config files...

if not exist ".gitignore" (
    > ".gitignore" (
        echo # Dependencies
        echo node_modules/
        echo dist/
        echo .vite/
        echo.
        echo # Local app data
        echo *.db
        echo *.sqlite
        echo *.sqlite3
        echo.
        echo # Generated outputs
        echo output/reports/*
        echo output/exports/*
        echo output/logs/*
        echo !output/reports/.gitkeep
        echo !output/exports/.gitkeep
        echo !output/logs/.gitkeep
        echo.
        echo # Private or plan-specific data
        echo data/private/*
        echo !data/private/.gitkeep
        echo.
        echo # Excel temporary files
        echo ~$*
        echo *.tmp
        echo.
        echo # OS/editor noise
        echo .DS_Store
        echo Thumbs.db
        echo .vscode/
        echo .idea/
    )
    echo CREATED: .gitignore
) else (
    echo SKIP: .gitignore already exists.
)

if not exist "README.md" (
    > "README.md" (
        echo # PBGC V1 Engine Explorer
        echo.
        echo Browser-based explorer for analyzing V1 spreadsheet engines.
        echo.
        echo ## Purpose
        echo.
        echo This project supports:
        echo.
        echo 1. Visual exploration of local formula dependencies in V1 spreadsheets.
        echo 2. Comparison of two or more V1 engines using similarity and distance metrics.
        echo 3. Statistical and summary reports for one engine or a group of engines.
        echo 4. Local storage of processed engines using a browser database.
        echo 5. Generation of a `Case_Complexity_Log.xlsx` file from processed engine features.
        echo.
        echo ## Data Flow
        echo.
        echo ```text
        echo V1 Workbook -^> VBA Extraction -^> V1Summary JSON/CSV -^> Canonical Engine Model
        echo -^> Dependency Graph -^> Feature Vector -^> Local Database -^> Reports
        echo ```
        echo.
        echo ## Repository Layout
        echo.
        echo - `src/` - application source code
        echo - `tools/vba/` - VBA extraction and preparation scripts
        echo - `tools/excel/` - Excel helper workbooks
        echo - `data/reference/` - non-sensitive reference data
        echo - `data/samples/` - sanitized sample inputs
        echo - `data/private/` - ignored local/private data
        echo - `docs/` - architecture, workflows, and domain notes
        echo - `legacy/` - historical prototypes
        echo - `output/` - generated reports and exports
    )
    echo CREATED: README.md
) else (
    echo SKIP: README.md already exists.
)

if not exist "CHANGELOG.md" (
    > "CHANGELOG.md" (
        echo # Changelog
        echo.
        echo ## Unreleased
        echo.
        echo - Initial repository architecture for V1 Engine Explorer.
    )
    echo CREATED: CHANGELOG.md
) else (
    echo SKIP: CHANGELOG.md already exists.
)

if not exist "index.html" (
    > "index.html" (
        echo ^<!doctype html^>
        echo ^<html lang="en"^>
        echo ^<head^>
        echo   ^<meta charset="utf-8" /^>
        echo   ^<meta name="viewport" content="width=device-width, initial-scale=1" /^>
        echo   ^<title^>PBGC V1 Engine Explorer^</title^>
        echo ^</head^>
        echo ^<body^>
        echo   ^<div id="app"^>PBGC V1 Engine Explorer^</div^>
        echo   ^<script type="module" src="./src/app/main.js"^>^</script^>
        echo ^</body^>
        echo ^</html^>
    )
    echo CREATED: index.html
) else (
    echo SKIP: index.html already exists.
)

echo.

REM ------------------------------------------------------------------------------
REM 7. Create initial docs if missing
REM ------------------------------------------------------------------------------

echo Creating initial architecture and decision documents...

if not exist "docs\architecture\folder-architecture.md" (
    > "docs\architecture\folder-architecture.md" (
        echo # Folder Architecture
        echo.
        echo The repository separates application source code, Excel/VBA extraction tools, domain documentation, sample data, generated outputs, and legacy prototypes.
        echo.
        echo ## Rule
        echo.
        echo ```text
        echo Can a user run it?             -^> scripts/
        echo Is it application logic?       -^> src/
        echo Is it VBA/Excel tooling?       -^> tools/
        echo Is it explanation?             -^> docs/
        echo Is it private data?            -^> data/private/
        echo Is it sample sanitized data?   -^> data/samples/
        echo Is it generated?               -^> output/
        echo Is it old but useful?          -^> legacy/
        echo ```
    )
    echo CREATED: docs\architecture\folder-architecture.md
)

if not exist "docs\architecture\data-flow.md" (
    > "docs\architecture\data-flow.md" (
        echo # Data Flow
        echo.
        echo ```text
        echo V1 Workbook
        echo   -^> VBA extraction tools
        echo   -^> V1Summary JSON / CSV artifacts
        echo   -^> canonical engine object
        echo   -^> dependency graph
        echo   -^> feature vector
        echo   -^> local browser database
        echo   -^> reports and Case_Complexity_Log.xlsx
        echo ```
    )
    echo CREATED: docs\architecture\data-flow.md
)

if not exist "docs\decisions\ADR-0001-local-database.md" (
    > "docs\decisions\ADR-0001-local-database.md" (
        echo # ADR-0001: Local Database
        echo.
        echo ## Decision
        echo.
        echo Use Dexie.js / IndexedDB as the initial local browser database.
        echo.
        echo ## Rationale
        echo.
        echo The app is browser-first, should work without a server, and must preserve processed engine artifacts locally.
        echo.
        echo ## Consequence
        echo.
        echo Application code should use an engine repository abstraction rather than direct Dexie calls everywhere.
    )
    echo CREATED: docs\decisions\ADR-0001-local-database.md
)

if not exist "docs\decisions\ADR-0002-canonical-engine-schema.md" (
    > "docs\decisions\ADR-0002-canonical-engine-schema.md" (
        echo # ADR-0002: Canonical Engine Schema
        echo.
        echo ## Decision
        echo.
        echo Normalize imported V1 summary artifacts into a canonical engine object before graphing, comparison, reporting, or database persistence.
        echo.
        echo ## Initial Shape
        echo.
        echo ```text
        echo Engine
        echo   engineId
        echo   engineName
        echo   sourceWorkbookName
        echo   importedAt
        echo   workbookSummary
        echo   worksheets
        echo   cells
        echo   namedRanges
        echo   formulas
        echo   edges
        echo   features
        echo   metadata
        echo ```
    )
    echo CREATED: docs\decisions\ADR-0002-canonical-engine-schema.md
)

if not exist "docs\decisions\ADR-0003-distance-metrics.md" (
    > "docs\decisions\ADR-0003-distance-metrics.md" (
        echo # ADR-0003: Distance Metrics
        echo.
        echo ## Decision
        echo.
        echo Engine similarity should be computed from multiple feature families:
        echo.
        echo - worksheet structure
        echo - formula signatures
        echo - function-call distribution
        echo - named-range usage
        echo - dependency graph topology
        echo - entitlement / benefit-processing concepts where available
        echo.
        echo ## Consequence
        echo.
        echo Do not define similarity from one scalar alone. Build a weighted feature vector and expose the weights.
    )
    echo CREATED: docs\decisions\ADR-0003-distance-metrics.md
)

echo.

REM ------------------------------------------------------------------------------
REM 8. Final Git guidance
REM ------------------------------------------------------------------------------

echo ============================================================
echo  Refactor complete.
echo ============================================================
echo.
echo Next recommended commands:
echo.
echo   git status
echo   git add .
echo   git commit -m "chore: organize project folders around V1 engine workflow"
echo.
echo Review moved files before committing, especially:
echo.
echo   data\samples\v1summary.sample.json
echo.
echo If that JSON contains private or case-specific data, move it to:
echo.
echo   data\private\
echo.
echo Done.
echo.

endlocal
exit /b 0