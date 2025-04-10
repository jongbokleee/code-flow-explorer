const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

let latestFunctionMap = {};
let latestExportedByFile = {};
let latestFiles = [];

const sanitize = (str) => str.replace(/[^a-zA-Z0-9_]/g, '_');

exports.getUpload = (req, res) => {
  res.render('flowscribe-upload', { pageTitle: 'FlowScribe 업로드' });
};

exports.postUpload = (req, res) => {
  const functionMap = {};
  const exportedByFile = {};
  const externalIgnoreList = ['then', 'catch', 'render', 'next', 'map', 'forEach'];

  const parseFile = (file) => {
    const filePath = file.path;
    const filename = file.originalname;
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = babelParser.parse(code, { sourceType: 'module', plugins: ['jsx'] });

    exportedByFile[filename] = [];

    traverse(ast, {
      AssignmentExpression(path) {
        const expr = path.node;
        if (
          expr.left.type === 'MemberExpression' &&
          expr.left.object.name === 'exports' &&
          (expr.right.type === 'ArrowFunctionExpression' || expr.right.type === 'FunctionExpression')
        ) {
          const funcName = expr.left.property.name;
          exportedByFile[filename].push(funcName);
          functionMap[funcName] = new Set();

          path.traverse({
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
      parseFile(file);
    });
  }

  latestFunctionMap = functionMap;
  latestExportedByFile = exportedByFile;
  latestFiles = Object.keys(exportedByFile);

  // 기본 mermaidCode
  let mermaid = 'graph TD;\n';
  for (const [caller, callees] of Object.entries(functionMap)) {
    const from = sanitize(caller);
    for (const callee of callees) {
      const to = sanitize(callee);
      mermaid += `${from} --> ${to};\n`;
    }
  }

  res.render('flowscribe-result', {
    mermaidCode: mermaid,
    fileMap: exportedByFile,
    selectedFile: latestFiles[0] || '',
    selectedFunc: exportedByFile[latestFiles[0]]?.[0] || ''
  });
};

exports.postFilter = (req, res) => {
  const { startFunc, fileName } = req.body;

  const visited = new Set();
  const mermaidLines = ['graph TD;'];

  const dfs = (caller) => {
    if (!latestFunctionMap[caller] || visited.has(caller)) return;
    visited.add(caller);
    latestFunctionMap[caller].forEach((callee) => {
      mermaidLines.push(`${sanitize(caller)} --> ${sanitize(callee)};`);
      dfs(callee);
    });
  };

  dfs(startFunc);

  res.render('flowscribe-result', {
    mermaidCode: mermaidLines.join('\n'),
    fileMap: latestExportedByFile,
    selectedFile: fileName,
    selectedFunc: startFunc
  });
};
