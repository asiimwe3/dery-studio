# Dery Studio

Write a website and real programs in plain English. No syntax.

**Live:** https://asiimwe3.github.io/dery-studio/

## Files

- `index.html` — app shell
- `app.js` — the editor (highlighting, autocomplete, files, terminal)
- `dery2.js` — the Dery language (parser + interpreter)
- `build.sh` — bumps the asset version so devices never keep a stale copy
- `deryc.c` — standalone C compiler for the original Dery interpreter

## Deploy

```
./build.sh && git add -A && git commit -m "update" && git push
```

## Language

```
Remember that price is 5000.
Show "Total: " plus price times 2.

Get the link "https://api.open-meteo.com/v1/forecast?latitude=0.65&longitude=30.28&current_weather=true" into w.
Show the value of "temperature" in the value of "current_weather" in w.

Add a heading that says "Live weather in Fort Portal".
```

Full reference inside the app: the "How to write" button.
