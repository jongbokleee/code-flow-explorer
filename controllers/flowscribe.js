
const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

exports.getUpload = (req, res) => {
  res.render('flowscribe-upload', { pageTitle: 'FlowScribe 업로드' });
};

exports.postUpload = (req, res) => {
  console.log('postUpload called (multi-file)');

  const functionMap = {};
  const exportedFunctions = new Set();
  const sanitize = (str) => str.replace(/[^a-zA-Z0-9_]/g, '_');
  const externalIgnoreList = ['then', 'catch', 'render', 'next', 'map', 'forEach'];

  let anonCounter = 1;

  const parseFile = (filePath) => {
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = babelParser.parse(code, { sourceType: 'module', plugins: ['jsx'] });

    traverse(ast, {
      AssignmentExpression(path) {
        const expr = path.node;
        if (
          expr.left.type === 'MemberExpression' &&
          expr.left.object.name === 'exports' &&
          (expr.right.type === 'ArrowFunctionExpression' || expr.right.type === 'FunctionExpression')
        ) {
          const funcName = expr.left.property.name;
          exportedFunctions.add(funcName);
          functionMap[funcName] = new Set();

          path.get('right').traverse({
            CallExpression(callPath) {
              const callee = callPath.node.callee;
              let calleeName = '';
              if (callee.type === 'Identifier') {
                calleeName = callee.name;
              } else if (callee.type === 'MemberExpression' && callee.property?.name) {
                calleeName = callee.property.name;
              }
              if (calleeName && !externalIgnoreList.includes(calleeName)) {
                functionMap[funcName].add(calleeName);
              }
            }
          });
        } else if (
          expr.left.type === 'MemberExpression' &&
          expr.left.object.name === 'module' &&
          expr.left.property.name === 'exports' &&
          (expr.right.type === 'ArrowFunctionExpression' || expr.right.type === 'FunctionExpression')
        ) {
          const funcName = `anonymousFunc_${anonCounter++}`;
          functionMap[funcName] = new Set();

          path.get('right').traverse({
            CallExpression(callPath) {
              const callee = callPath.node.callee;
              let calleeName = '';
              if (callee.type === 'Identifier') {
                calleeName = callee.name;
              } else if (callee.type === 'MemberExpression' && callee.property?.name) {
                calleeName = callee.property.name;
              }
              if (calleeName && !externalIgnoreList.includes(calleeName)) {
                functionMap[funcName].add(calleeName);
              }
            }
          });
        }
      }
    });
  };

  if (Array.isArray(req.files)) {
    req.files.forEach((file) => {
      parseFile(file.path);
    });
  }

  let mermaid = 'graph TD;\n';
  for (const [caller, callees] of Object.entries(functionMap)) {
    const from = sanitize(caller);
    for (const callee of callees) {
      const to = sanitize(callee);
      mermaid += `${from} --> ${to};\n`;
    }
  }

  console.log('Generated Mermaid Code:\n', mermaid);
  res.render('flowscribe-result', { mermaidCode: mermaid });
};
