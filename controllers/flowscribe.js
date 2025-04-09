const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

exports.getUpload = (req, res) => {
  res.render('flowscribe-upload', { pageTitle: 'FlowScribe 업로드' });
};

exports.postUpload = (req, res) => {
  console.log('postUpload called');

  const filePath = req.file.path;
  const code = fs.readFileSync(filePath, 'utf-8');

  const ast = babelParser.parse(code, { sourceType: 'module', plugins: ['jsx'] });

  const functionMap = {};
  const exportedFunctions = new Set();
  const externalIgnoreList = ['then', 'catch', 'render', 'next', 'map', 'forEach', 'toFixed', 'get', 'set', 'execPopulate', 'populate'];

  const sanitize = (str) => str.replace(/[^a-zA-Z0-9_]/g, '_');

  const addCallsFromBody = (bodyPath, funcName) => {
    bodyPath.traverse({
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
  };

  traverse(ast, {
    ExpressionStatement(path) {
      const expr = path.node.expression;
      if (
        expr.type === 'AssignmentExpression' &&
        expr.left.type === 'MemberExpression' &&
        expr.left.object.name === 'exports' &&
        (expr.right.type === 'ArrowFunctionExpression' || expr.right.type === 'FunctionExpression')
      ) {
        const funcName = expr.left.property.name;
        exportedFunctions.add(funcName);
        functionMap[funcName] = new Set();
        addCallsFromBody(path, funcName);
      }
    }
  });

  let mermaid = 'graph TD;\n';
  for (const [caller, callees] of Object.entries(functionMap)) {
    if (!exportedFunctions.has(caller)) continue; // Only show exported functions as caller
    const from = sanitize(caller);
    for (const callee of callees) {
      const to = sanitize(callee);
      mermaid += `${from} --> ${to};\n`;
    }
  }

  console.log('Generated Mermaid Code:\n', mermaid);
  res.render('flowscribe-result', { mermaidCode: mermaid });
};
