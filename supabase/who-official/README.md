# Official WHO Child Growth Standards

These Excel files were downloaded from the official WHO Child Growth Standards indicator pages:

- https://www.who.int/tools/child-growth-standards/standards/weight-for-age
- https://www.who.int/tools/child-growth-standards/standards/length-height-for-age
- https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height

They contain the sex-specific LMS parameters used to generate
`supabase/who-growth-standards-official.sql`.

Regenerate the SQL migration with:

```sh
node scripts/generate-who-growth-sql.mjs
```
