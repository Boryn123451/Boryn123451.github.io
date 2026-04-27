# Scientific CAS Calculator

Rozbudowany kalkulator naukowy oparty o `FastAPI + SymPy + React + KaTeX + Plotly`.

## Najprostsze uruchomienie

W PowerShellu, z katalogu projektu:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\run.ps1
```

Lub bez PowerShella, bezposrednio z pliku:

```bat
run.bat
```

Skrypt:

- tworzy `.venv`
- instaluje zaleznosci backendu
- instaluje zaleznosci frontendu
- buduje frontend
- uruchamia jedna aplikacje pod `http://127.0.0.1:8000`

## Kolejne uruchomienia

Jesli zaleznosci sa juz zainstalowane, wystarczy:

```powershell
.\run.ps1 -SkipInstall
```

Lub z gotowego pliku:

```bat
run-skip-install.bat
```

Jesli frontend jest juz zbudowany i chcesz tylko szybko wystartowac backend:

```powershell
.\run.ps1 -SkipInstall -NoBuild
```

## Tryb developerski

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\dev.ps1
```

To uruchamia:

- backend FastAPI z `--reload` na `http://127.0.0.1:8000`
- frontend Vite na `http://127.0.0.1:5173`

## Architektura

- `backend/app/core/`: silnik CAS, parser, formatter LaTeX, solver, analiza i wykresy
- `backend/app/api/`: schematy i endpointy REST
- `frontend/src/`: UI React, stan aplikacji, historia, pamiec, KaTeX i Plotly

## Funkcje

- tryb `Exact` i `Approx`
- render matematyki przez KaTeX
- ulamki niewlasciwe i mieszane
- pochodne i calki
- rownania wielomianowe do 4 stopnia
- macierze, liczby zespolone, trygonometria
- historia i pamiec
- wiele wykresow naraz z wykrywaniem przeciec

## Przykladowe wejscia

- `sin(pi/3)`
- `5/2`
- `Matrix([[1,2],[3,4]]) * Matrix([[5],[6]])`
- `x^4 + 1 = 0`
- `sin(x)^2`
