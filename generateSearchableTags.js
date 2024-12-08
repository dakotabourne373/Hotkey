const data = require('./tags.json');
const fs = require('node:fs');

let result = {};

const snakeToCamel = str =>
    str.toLowerCase().replace(/([-_][a-z])/g, group =>
      group
        .toUpperCase()
        .replace('-', '')
        .replace('_', '')
    );

    const titleCase = (s) =>
        s.toLowerCase().replace (/^[-_]*(.)/, (_, c) => c.toUpperCase())       // Initial char (after -/_)
         .replace (/[-_]+(.)/g, (_, c) => c.toUpperCase()) // First char after each -/_
      

Object.entries(data).forEach(([icon, tags]) => {
    const camelIcon = titleCase(icon);
    result[camelIcon] = [camelIcon];
    tags.forEach((tag) => {
        result[tag] = [
            ...(result[tag] || []),
            camelIcon
        ];
    });
});

fs.writeFileSync('./newTags.json', JSON.stringify(result, null, 2));
