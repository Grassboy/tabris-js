let path = require('path');

const SNIPPETS_LOCATION = 'snippets';

module.exports = function (grunt) {

  grunt.registerTask('generate-doc', () => {
    let data = {
      api: readAPI(),
      widgets: readWidgets(),
      types: readTypes()
    };
    resolveIncludes(data);
    renderWidgets(data);
    renderAPI(data);
    renderIndex(data);
  });

  function renderWidgets(data) {
    Object.keys(data.widgets).forEach(type => {
      grunt.file.write(getTargetPath(data.widgets[type]), renderDocument(data, type));
    });
  }

  function renderAPI(data) {
    Object.keys(data.api).forEach(type => {
      grunt.file.write(getTargetPath(data.api[type]), renderDocument(data, type));
    });
  }

  function renderIndex(data) {
    grunt.log.verbose.writeln('Generating index');
    let widgets = ['Widget'].concat(Object.keys(data.widgets).filter(name => name !== 'Widget'));
    let widgetIndex = [];
    widgets.forEach(type => {
      let json = data.widgets[type];
      widgetIndex.push('- [' + title(json) + '](api/' + path.parse(json.file).name + '.md)');
    });
    let apiIndex = [];
    Object.keys(data.api).forEach(type => {
      let json = data.api[type];
      apiIndex.push('- [' + title(json) + '](api/' + path.parse(json.file).name + '.md)');
    });
    let templData = {data: {widgets: widgetIndex.join('\n'), api: apiIndex.join('\n')}};
    grunt.file.write(getIndexPath(), grunt.template.process(grunt.file.read(getIndexPath()), templData));
  }

  function renderDocument(data, type) {
    grunt.log.verbose.writeln('Generating DOC for ' + type);
    let json = data.widgets[type] || data.api[type];
    return [
      '# ' + title(json) + '\n',
      renderDescription(json),
      renderImages(json),
      renderExample(json),
      renderIncludes(json),
      renderMembers(json, data),
      renderSnippet(json),
      renderLinks(json)
    ].filter(notEmpty).join('\n');
  }

  function renderMembers(json, data) {
    return [
      renderMethods(json, data),
      renderProperties(json, data),
      renderEvents(json, data)
    ].filter(notEmpty).join('\n');
  }

  function renderExample(json) {
    if (grunt.file.isFile(getTargetPath(json))) {
      return grunt.file.read(getTargetPath(json));
    }
  }

  function renderSnippet(json) {
    if (grunt.file.isFile(getSnippetPath(json))) {
      return [
        '## Example',
        '```javascript',
        grunt.file.read(getSnippetPath(json)),
        '```'
      ].join('\n');
    }
  }

  function resolveIncludes(data) {
    Object.keys(data.widgets).concat(Object.keys(data.api)).forEach(type => {
      let json = data.widgets[type] || data.api[type];
      if (json.include) {
        json.include = json.include.map(type => {
          let include = data.widgets[type] || data.api[type];
          if (!include) {
            throw new Error('Could not find included type ' + type);
          }
          return include;
        });
      }
    });
  }

  function readWidgets() {
    let widgets = {};
    grunt.file.expand(grunt.config('doc').widgets).forEach(file => {
      let json = grunt.file.readJSON(file);
      json.file = file;
      widgets[json.type] = json;
    });
    return widgets;
  }

  function readAPI() {
    let api = {};
    grunt.file.expand(grunt.config('doc').api).forEach(file => {
      let json = grunt.file.readJSON(file);
      json.file = file;
      api[json.type] = json;
    });
    return api;
  }

  function readTypes() {
    let md = grunt.file.read(grunt.config('doc').types);
    return md.match(/^##\ *(.*)$/gm).map(heading => heading.slice(3).toLowerCase());
  }

  function getSnippetPath(json) {
    return path.join(SNIPPETS_LOCATION, `${json.type.toLowerCase()}.js`);
  }

  function getTargetPath(json) {
    return grunt.config('doc').target + path.parse(json.file).name + '.md';
  }

  function getIndexPath() {
    return grunt.config('doc').index;
  }

  function renderImages(json) {
    if (hasAndroidImage(json) && hasiOSImage(json)) {
      return [
        'Android | iOS',
        '--- | ---',
        '![' + json.type + ' on Android](img/android/' + path.parse(json.file).name + '.png) | ' +
          '![' + json.type + ' on iOS](img/ios/' + path.parse(json.file).name + '.png)'
      ].join('\n') + '\n';
    }
    if (hasAndroidImage(json)) {
      return '![' + json.type + ' on Android](img/android/' + path.parse(json.file).name + '.png)\n';
    }
    if (hasiOSImage(json)) {
      return '![' + json.type + ' on iOS](img/ios/' + path.parse(json.file).name + '.png)\n';
    }
    return '';
  }

  function renderDescription(json) {
    if (json.description) {
      return json.description + '\n';
    }
    return '';
  }

  function renderIncludes(json) {
    let result = [];
    if (json.include) {
      result.push('Includes ');
      result.push(json.include.map(widget => '[' + title(widget) + '](' + widget.type + '.md)').join(', '));
      result.push('\n');
    }
    return result.join('');
  }

  function renderMethods(json, data) {
    if (!json.methods) {
      return '';
    }
    let result = [];
    result.push('## Methods\n\n');
    Object.keys(json.methods).sort().forEach(name => {
      Array.prototype.forEach.call(json.methods[name], desc => {
        result.push(renderMethod(name, desc, data));
      });
    });
    return result.join('');
  }

  function renderMethod(name, desc, data) {
    let result = [];
    result.push('### ' + name + '(' + renderParamList(desc.parameters, data) + ')\n\n');
    if (desc.parameters) {
      result.push('\n**Parameters:** ' + renderParamList(desc.parameters, data, true) + '\n');
    }
    if (desc.returns) {
      result.push('**Returns:** *' + renderTypeLink(desc.returns, data) + '*\n');
    }
    if (desc.provisional) {
      result.push(provisionalNote);
    }
    if (desc.description) {
      result.push(desc.description);
    }
    result.push('\n\n');
    return result.join('\n');
  }

  function renderProperties(json, data) {
    if (!json.properties) {
      return '';
    }
    let result = [];
    result.push('## Properties\n\n');
    Object.keys(json.properties).sort().forEach(name => {
      let property = json.properties[name];
      result.push('### ', name, '\n\n');
      result.push('Type: ', renderPropertyType(property, data), '\n');
      if (property.provisional) {
        result.push(provisionalNote);
      }
      if (property.description) {
        result.push('\n' + property.description);
      }
      if (property.static) {
        result.push('<br/>This property can only be set on widget creation. ' +
        'Once set, it cannot be changed anymore.');
      }
      result.push('\n\n');
    });
    return result.join('');
  }

  function renderPropertyType(property, data) {
    let name = property.type;
    let result = ['*', renderTypeLink(name, data), '*'];
    if (property.values) {
      result.push(', supported values: `' + property.values.join('`, `') + '`');
    }
    if (property.default) {
      result.push(', default: `' + property.default + '`');
    }
    return result.join('');
  }

  function renderEvents(json, data) {
    if (!json.events) {
      return '';
    }
    let result = [];
    result.push('## Events\n\n');
    Object.keys(json.events).sort().forEach(name => {
      let event = json.events[name];
      result.push('### "', name, '" (' + renderParamList(event.parameters, data) + ')\n');
      if (event.parameters) {
        result.push('\n**Parameters:** ' + renderParamList(event.parameters, data, true) + '\n');
      }
      if (event.provisional) {
        result.push(provisionalNote);
      }
      if (event.description) {
        result.push('\n' + event.description + '\n');
      }
      result.push('\n\n');
    });
    return result.join('');
  }

  function renderParamList(parameters, data, detailed) {
    if (!detailed) {
      return parameters.map(param => typeof param === 'object' ? param.name : param).join(', ');
    }
    return '\n\n' + parameters.map(param => {
      let result = ['- ', param.name, ': '];
      if (param.type) {
        result.push('*', renderTypeLink(param.type, data), '*');
      } else if (param.value) {
        result.push('`', param.value, '`');
      }
      if (param.description) {
        result.push(', ' + firstCharLower(param.description));
      }
      return result.join('');
    }).join('\n');
  }

  function renderLinks(json) {
    if (!json.links) {
      return '';
    }
    let result = [];
    result.push('## See also\n\n');
    json.links.forEach(link => {
      let path = link.path.replace('${GITHUB_BRANCH}',
        'https://github.com/eclipsesource/tabris-js/tree/v' + grunt.config('version'));
      result.push(`- [${link.title}](${path})\n`);
    });
    return result.join('');
  }

  function renderTypeLink(name, data) {
    if (data.types.indexOf(name.toLowerCase()) !== -1) {
      return '[' + name + '](' + getTypeDocPath() + '#' + name.toLowerCase() + ')';
    } else if (data.widgets[firstCharUp(name)]) {
      return '[' + name + '](' + name + '.md)';
    } else if (data.api[firstCharUp(name)]) {
      return '[' + name + '](' + name + '.md)';
    } else {
      return name;
    }
  }

  function notEmpty(value) {
    return !!value;
  }

  function getTypeDocPath() {
    let types = grunt.config('doc').types;
    let target = grunt.config('doc').target;
    return path.relative(target, types).replace(path.sep, '/');
  }

  function firstCharUp(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function firstCharLower(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  function title(json) {
    return json.object || json.type;
  }

  function hasAndroidImage(json) {
    return grunt.file.isFile(fileImagePath(json.file, 'android'));
  }

  function hasiOSImage(json) {
    return grunt.file.isFile(fileImagePath(json.file, 'ios'));
  }

  function fileImagePath(file, platform) {
    let filePath = file.split(path.sep);
    return path.join(
      ...filePath.slice(0, filePath.length - 2),
      'img',
      platform,
      path.parse(file).name + '.png'
    );
  }

  let provisionalNote = '\n**Note:** this API is provisional and may change in a future release.\n';

};
