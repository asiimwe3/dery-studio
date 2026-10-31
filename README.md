# Dery Studio

Write a website in plain English. No syntax, no brackets, no semicolons.

**Live editor:** https://asiimwe3.github.io/dery-studio/

Example:

```
Create a website called "Peters Medicare".
Add a big heading that says "Healthcare you can trust".
Add a paragraph that says "Walk in any day from 8 in the morning."
Add a button that says "Call us" linking to "tel:+256700000000".
Add a contact form.
Make the background color dark.
Set the text color to white.
Make the buttons orange.
```

## Files

- `index.html` — the IDE (editor + live preview, single file, no dependencies)
- `deryweb.js` — the English to HTML compiler (browser + Node)
- `example.english` — a full sample program

## Run without the IDE

```
node -e 'const {compile}=require("./deryweb.js"); const fs=require("fs");
const r=compile(fs.readFileSync("example.english","utf8")); fs.writeFileSync("out.html", r.html);'
```
