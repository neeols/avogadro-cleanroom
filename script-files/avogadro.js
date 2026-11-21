/* Small enhancements to standard Javadoc pages. */
document.addEventListener('DOMContentLoaded', () => {
  const script = [...document.scripts].find((s) => s.src.endsWith('avogadro.js'));
  if (script) {
    const root = new URL(script.src.includes('/script-files/') ? '../' : '.', script.src);
    const legacyViews = {
      'overview-tree.html': 'tree',
      'index-all.html': 'index',
      'search.html': 'search',
    };
    for (const [page, view] of Object.entries(legacyViews)) {
      if (location.pathname === new URL(page, root).pathname) {
        const destination = new URL('browse.html', root);
        destination.search = location.search;
        destination.hash = location.hash || view;
        location.replace(destination.href);
        return;
      }
    }
    const navigation = document.querySelector('#navbar-top-firstrow');
    if (navigation) {
      const item = document.createElement('li');
      item.className = 'av-reference-picker';
      const picker = document.createElement('select');
      picker.setAttribute('aria-label', 'Kotlin and Scala documentation');
      picker.title = 'Open a language reference in a new tab';
      [
        ['', 'Language APIs ↗'],
        ['kotlin/index.html', 'Dokka (Kotlin)'],
        ['scala/index.html', 'Scaladoc (Scala 3)'],
      ].forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        if (!value) {
          option.disabled = true;
          option.hidden = true;
          option.selected = true;
        }
        picker.append(option);
      });
      picker.addEventListener('change', () => {
        const destination = picker.value;
        // This is a launcher, not persistent navigation state. Reset even if popups are blocked.
        picker.value = '';
        if (destination)
          window.open(new URL(destination, root).href, '_blank', 'noopener,noreferrer');
      });
      item.append(picker);
      navigation.append(item);
      addBrowsingTree(navigation, root);
    }
  }
  initializeBrowsePage();
  const guide = document.querySelector('.av-guide');
  if (!guide) return;
  // Keep one language preference for examples and their field tables. Each code toolbar
  // exposes the same selector, so readers need not scroll back to a page-level control.
  const languages = (guide.dataset.languages || 'java groovy json').split(/\s+/);
  let selectedLanguage = languages[0];
  guide.querySelector('.av-language')?.setAttribute('hidden', '');
  guide.querySelectorAll('img').forEach((img) => {
    img.loading = 'lazy';
  });
  guide.querySelectorAll('a.av-video').forEach((link) => {
    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'none';
    video.src = link.href;
    video.poster = link.dataset.poster;
    link.replaceWith(video);
  });

  const choose = (value) => {
    if (!languages.includes(value)) value = languages[0];
    selectedLanguage = value;
    guide.querySelectorAll('.av-code-language:not(.av-recipe-language)').forEach((select) => {
      select.value = [...select.options].some((option) => option.value === value)
        ? value
        : select.options[0].value;
    });
    guide.querySelectorAll('[data-language]').forEach((block) => {
      if (block.closest('.av-example-group')) return;
      block.hidden = !block.dataset.language.split(/\s+/).includes(value);
    });
    try {
      localStorage.setItem('avogadro-example-language', value);
    } catch {
      /* Storage is optional. */
    }
  };
  let preferred = 'java';
  try {
    preferred = localStorage.getItem('avogadro-example-language') || preferred;
  } catch {
    /* File viewers may deny storage. */
  }
  choose(new URLSearchParams(window.location.search).get('language') || preferred);
  guide.querySelectorAll('[data-choose-language]').forEach((button) => {
    button.addEventListener('click', () => choose(button.dataset.chooseLanguage));
  });
  const headings = [...guide.querySelectorAll('h2[id]')];
  if (headings.length > 1) {
    const nav = document.createElement('nav');
    nav.className = 'av-toc';
    nav.setAttribute('aria-label', 'On this page');
    const label = document.createElement('strong');
    label.textContent = 'On this page';
    nav.append(label);
    const list = document.createElement('ul');
    headings.forEach((heading) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      item.append(link);
      list.append(item);
    });
    nav.append(list);
    (guide.querySelector('.av-lead') || guide.querySelector('h1')).after(nav);
  }
  addMoleculeRegistrationExamples(guide);
  addOperationExamples(guide);
  // One stable toolbar per recipe: changing language must not hide the focused selector.
  guide.querySelectorAll('.av-example-group').forEach((group) => {
    const examples = [...group.querySelectorAll('pre[data-language]')];
    if (!examples.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'av-code-wrap';
    examples[0].before(wrap);
    const toolbar = document.createElement('div');
    toolbar.className = 'av-code-toolbar';
    const selector = document.createElement('select');
    selector.className = 'av-code-language av-recipe-language';
    selector.setAttribute(
      'aria-label',
      'Example language: ' + group.querySelector('h2, h3').textContent,
    );
    examples.forEach((pre) => {
      const option = document.createElement('option');
      option.value = pre.dataset.language;
      option.textContent =
        {
          java: 'Java',
          kotlin: 'Kotlin',
          groovy: 'GroovyScript',
          json: 'JSON',
          scala: 'Scala 3',
          zenscript: 'CraftTweaker',
        }[option.value] || option.value;
      selector.append(option);
      pre.tabIndex = 0;
    });
    const chooseRecipe = (value) => {
      if (!examples.some((pre) => pre.dataset.language === value))
        value = examples[0].dataset.language;
      selector.value = value;
      examples.forEach((pre) => {
        pre.hidden = pre.dataset.language !== value;
      });
    };
    // Retain each recipe independently; changing one toolbar never resets its neighbors.
    const recipeKey = 'avogadro-recipe-language:' + location.pathname + ':' + group.dataset.example;
    let recipeLanguage = group.dataset.defaultLanguage || selectedLanguage;
    try {
      recipeLanguage = localStorage.getItem(recipeKey) || recipeLanguage;
    } catch {
      /* Storage is optional. */
    }
    chooseRecipe(new URLSearchParams(location.search).get('language') || recipeLanguage);
    selector.addEventListener('change', () => {
      chooseRecipe(selector.value);
      document.dispatchEvent(new Event('wiki-examples-changed'));
      try {
        localStorage.setItem(recipeKey, selector.value);
      } catch {
        /* Storage is optional. */
      }
    });
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'av-copy';
    copy.textContent = 'Copy';
    copy.setAttribute('aria-label', 'Copy selected language example');
    copy.setAttribute('aria-live', 'polite');
    copy.addEventListener('click', async () => {
      const pre = examples.find((block) => !block.hidden);
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.textContent);
        copy.textContent = 'Copied';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = 'Selected';
      }
      window.setTimeout(() => {
        copy.textContent = 'Copy';
      }, 2000);
    });
    toolbar.append(selector, copy);
    wrap.append(toolbar, ...examples);
  });
  guide.querySelectorAll('pre').forEach((pre) => {
    if (pre.closest('.av-example-group') || (pre.hidden && !pre.dataset.language)) return;
    const wrap = document.createElement('div');
    wrap.className = 'av-code-wrap';
    if (pre.dataset.language) {
      wrap.dataset.language = pre.dataset.language;
      wrap.hidden = pre.hidden;
    }
    pre.before(wrap);
    const button = document.createElement('button');
    button.className = 'av-copy';
    button.type = 'button';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy this code example');
    button.setAttribute('aria-live', 'polite');
    const toolbar = document.createElement('div');
    toolbar.className = 'av-code-toolbar';
    const selector = document.createElement('select');
    selector.className = 'av-code-language';
    selector.setAttribute('aria-label', 'Example language');
    const explicitLanguage = (pre.querySelector('code')?.className + ' ' + pre.className).match(
      /\blang(?:uage)?-([\w-]+)/,
    )?.[1];
    const declaredLanguage = pre.closest('[data-language]')?.dataset.language;
    // A language menu only offers alternatives supplied by the authored example.
    const available = explicitLanguage
      ? [explicitLanguage]
      : declaredLanguage
        ? languages
        : ['text'];
    available.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent =
        {
          java: 'Java',
          groovy: 'Groovy',
          json: 'JSON',
          kotlin: 'Kotlin',
          scala: 'Scala 3',
          zenscript: 'ZenScript',
          powershell: 'PowerShell',
          command: 'Command',
          text: 'Text',
        }[value] || value;
      selector.append(option);
    });
    selector.value = available.includes(selectedLanguage) ? selectedLanguage : available[0];
    if (available.length > 1) selector.addEventListener('change', () => choose(selector.value));
    toolbar.append(selector, button);
    wrap.append(toolbar, pre);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent);
        button.textContent = 'Copied';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = 'Selected';
      }
      window.setTimeout(() => {
        button.textContent = 'Copy';
      }, 2000);
    });
  });
  document.dispatchEvent(new Event('wiki-examples-changed'));
});

/** Switches between the JDK-generated hierarchy, alphabetical index and search without separate pages. */
function initializeBrowsePage() {
  const tabs = [...document.querySelectorAll('[data-av-browse]')];
  if (!tabs.length) return;
  const choose = () => {
    const hash = location.hash.substring(1);
    const view = hash.startsWith('I:')
      ? 'index'
      : ['tree', 'index', 'search'].includes(hash)
        ? hash
        : new URLSearchParams(location.search).has('q')
          ? 'search'
          : 'tree';
    tabs.forEach((tab) => {
      const selected = tab.dataset.avBrowse === view;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    if (hash.startsWith('I:'))
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
  };
  const activate = (tab) => {
    location.hash = tab.dataset.avBrowse;
    choose();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      const targets = {
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      event.stopPropagation();
      const next = tabs[targets[event.key]];
      activate(next);
      next.focus();
    });
  });
  // The native search keyboard shortcuts must reveal their input even when another view is selected.
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !== '/' ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
        event.target.isContentEditable
      )
        return;
      event.preventDefault();
      activate(tabs.find((tab) => tab.dataset.avBrowse === 'search'));
      document.getElementById('page-search-input').focus();
    },
    true,
  );
  window.addEventListener('hashchange', choose);
  choose();
}

/** Adds a lazy, keyboard-accessible browsing tree without replacing the JDK doclet navigation. */
function addBrowsingTree(navigation, root) {
  const item = document.createElement('li');
  item.className = 'av-browse-item';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'av-browse-toggle';
  toggle.textContent = '☰';
  toggle.title = 'Browse documentation';
  toggle.setAttribute('aria-label', 'Browse documentation');
  toggle.setAttribute('aria-controls', 'av-browsing-tree');
  toggle.setAttribute('aria-expanded', 'false');
  item.append(toggle);
  navigation.prepend(item);

  const sidebar = document.createElement('aside');
  sidebar.id = 'av-browsing-tree';
  sidebar.setAttribute('aria-label', 'Documentation browsing tree');
  sidebar.hidden = true;
  const heading = document.createElement('strong');
  heading.textContent = 'Documentation';
  const content = document.createElement('div');
  content.className = 'av-tree-content';
  sidebar.append(heading, content);
  const handle = document.createElement('div');
  handle.className = 'av-sidebar-resize';
  handle.tabIndex = 0;
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-label', 'Resize documentation sidebar');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.title = 'Drag to resize; arrow keys also adjust width';
  sidebar.append(handle);
  document.body.append(sidebar);
  const read = (key, fallback) => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const save = (key, value) => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* Storage is optional. */
    }
  };
  let width = Number(read('avogadro-sidebar-width', 280));
  const limits = () => [
    Math.min(200, window.innerWidth * 0.4),
    Math.min(600, window.innerWidth * 0.7),
  ];
  const resize = (value) => {
    const [min, max] = limits();
    width = Math.round(Math.max(min, Math.min(max, Number.isFinite(value) ? value : 280)));
    document.documentElement.style.setProperty('--av-sidebar-width', width + 'px');
    handle.setAttribute('aria-valuemin', String(Math.round(min)));
    handle.setAttribute('aria-valuemax', String(Math.round(max)));
    handle.setAttribute('aria-valuenow', String(width));
  };
  const position = () => {
    const header = document.querySelector('body > header');
    const bottom = header?.getBoundingClientRect().bottom || 80;
    sidebar.style.top = Math.max(0, bottom) + 'px';
    resize(width);
  };
  resize(width);
  position();
  let loaded = false;
  const load = async () => {
    if (loaded) return;
    loaded = true;
    content.textContent = 'Loading…';
    try {
      const response = await fetch(new URL('docs-navigation.json', root));
      if (!response.ok) throw new Error('Navigation index unavailable');
      const entries = await response.json();
      const list = (nodes) => {
        const ul = document.createElement('ul');
        nodes.forEach((node) => {
          const li = document.createElement('li');
          if (node.children) {
            const folder = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = node.label;
            folder.append(summary, list(node.children));
            li.append(folder);
          } else {
            const link = document.createElement('a');
            link.textContent = node.label;
            link.href = new URL(node.href, root);
            if (new URL(link.href).pathname === location.pathname)
              link.setAttribute('aria-current', 'page');
            li.append(link);
          }
          ul.append(li);
        });
        return ul;
      };
      content.replaceChildren(list(entries));
    } catch {
      loaded = false;
      content.textContent = 'The tree could not load. Reopen it to retry, or use Overview.';
    }
  };
  const show = (open) => {
    sidebar.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('av-sidebar-open', open);
    if (open) {
      position();
      load();
    }
  };
  toggle.addEventListener('click', () => show(sidebar.hidden));
  sidebar.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      show(false);
      toggle.focus();
    }
  });
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add('av-sidebar-resizing');
  });
  handle.addEventListener('pointermove', (event) => {
    if (handle.hasPointerCapture(event.pointerId)) resize(event.clientX);
  });
  const finish = () => {
    document.body.classList.remove('av-sidebar-resizing');
    save('avogadro-sidebar-width', width);
  };
  handle.addEventListener('pointerup', (event) => {
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    finish();
  });
  handle.addEventListener('lostpointercapture', finish);
  handle.addEventListener('keydown', (event) => {
    const [min, max] = limits();
    const step = event.shiftKey ? 48 : 16;
    const values = { ArrowLeft: width - step, ArrowRight: width + step, Home: min, End: max };
    if (event.key in values) {
      event.preventDefault();
      resize(values[event.key]);
      save('avogadro-sidebar-width', width);
    }
  });
  window.addEventListener('resize', position);
  const header = document.querySelector('body > header');
  if (window.ResizeObserver && header) new ResizeObserver(position).observe(header);
  // Persist only the chosen width. Each page starts with a closed tree and collapsed folders.
}

/** Render each registration using the language's molecule and geometry calls. */
function moleculeRegistrationSources(id, definition) {
  return {
    json: JSON.stringify(definition, null, 2),
    ...Object.fromEntries(
      ['java', 'kotlin', 'scala', 'groovy', 'zenscript'].map((language) => [
        language,
        nativeRegistration(id, definition, language),
      ]),
    ),
  };
}

function nativeRegistration(id, definition, language, fragmentName = 'fragment') {
  const zen = language === 'zenscript';
  const groovy = language === 'groovy';
  const kotlin = language === 'kotlin';
  const scala = language === 'scala';
  const semicolon = language === 'java' || zen ? ';' : '';
  const lines = [];

  const quote = (value) => {
    const literal = JSON.stringify(value);
    return kotlin || groovy ? literal.replaceAll('$', String.fromCharCode(92) + '$') : literal;
  };
  const decimal = (value) => (Number.isInteger(value) ? value.toFixed(1) : String(value));
  const args = (values) => values.join(', ');
  const emit = (line) => lines.push(line + semicolon);
  const call = (target, method, ...values) =>
    emit(target + '.' + method + '(' + args(values) + ')');
  const letValue = (name, expression) => {
    const keyword = zen || kotlin || scala ? 'val' : groovy ? 'def' : 'var';
    emit(keyword + ' ' + name + ' = ' + expression);
    return name;
  };
  const construct = (type, ...values) => (kotlin ? '' : 'new ') + type + '(' + args(values) + ')';
  const order = (type = 'SINGLE') => {
    if (typeof type === 'number') return type;
    const value = ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUADRUPLE'].indexOf(type.toUpperCase());
    if (value < 0) throw new Error('Unknown guide bond type: ' + type);
    return value + 1;
  };
  const bondType = (type) =>
    'BondType.' + ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUADRUPLE'][order(type) - 1];
  const numberArray = (values, kind = 'double') => {
    const nested = Array.isArray(values[0]);
    const entries = nested
      ? values.map((row) => numberArray(row, kind))
      : values.map(kind === 'double' ? decimal : String);
    const type = kind + (nested ? '[][]' : '[]');
    if (zen) return '[' + args(entries) + '] as ' + type;
    if (groovy) return '[' + args(entries) + '] as ' + type;
    if (kotlin) return (nested ? 'arrayOf' : kind + 'ArrayOf') + '(' + args(entries) + ')';
    if (scala)
      return 'Array' + (nested || entries.length ? '' : '[Int]') + '(' + args(entries) + ')';
    return 'new ' + type + ' { ' + args(entries) + ' }';
  };
  const identity = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
  ];
  const transform = (target, matrix) => {
    if (matrix && JSON.stringify(matrix) !== JSON.stringify(identity)) {
      call(target, zen ? 'transform' : 'transformLast', numberArray(matrix));
    }
  };
  const nuclear = (target, index, value, fragment = false) => {
    const core = [value.atomic_number, value.neutrons, value.charge ?? 0];
    const shells = value.electron_shells ?? [];
    if (zen) call(target, 'atomConfiguration', index, ...core, numberArray(shells, 'int'));
    else if (fragment)
      call(
        target,
        'atomConfiguration',
        index,
        construct(
          'AtomicConfiguration',
          ...core,
          (scala ? 'java.util.List.of[Integer]' : 'java.util.List.of') + '(' + args(shells) + ')',
        ),
      );
    else call(target, 'atomConfiguration', index, ...core, ...shells);
  };

  const fragment = (shape, name, returnResult = false) => {
    const draft = letValue(
      name + 'Builder',
      zen
        ? 'Molecules.fragment()'
        : groovy
          ? 'molecules.structureBuilder()'
          : construct('StructureBuilder'),
    );
    shape.atoms.forEach((atom, index) => {
      call(draft, 'atom', quote(atom.e), ...[atom.x, atom.y, atom.z].map(decimal));
      if (atom.nuclear) nuclear(draft, index, atom.nuclear, true);
    });
    for (const [from, to, type] of shape.bonds ?? [])
      call(draft, 'bond', from, to, zen ? order(type) : bondType(type));
    for (const [name, index] of Object.entries(shape.attachments ?? {}))
      call(draft, 'attachment', quote(name), index);
    let expression = draft + '.build()';
    for (const op of shape.operations ?? []) {
      if (op.op !== 'wrapCylinder') throw new Error('Unsupported fragment operation: ' + op.op);
      expression +=
        '.wrapCylinder(' +
        args([
          numberArray(op.origin ?? [0, 0, 0]),
          numberArray(op.circumference),
          numberArray(op.axis),
          decimal(op.length),
        ]) +
        ')';
    }
    if (returnResult) emit('return ' + expression);
    else return letValue(name, expression);
  };

  const capitalize = (name) => name.charAt(0).toUpperCase() + name.slice(1);
  const camelCase = (name) =>
    name.replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, letter) => letter.toUpperCase());
  const assembly = (shape, name, partPrefix = '') => {
    const draft = letValue(
      name + 'Builder',
      zen
        ? 'Molecules.assembly()'
        : groovy
          ? 'molecules.assemblyBuilder()'
          : 'StructureAssembly.builder()',
    );
    for (const node of shape.nodes) {
      const part = partPrefix
        ? partPrefix + capitalize(camelCase(node.name))
        : camelCase(node.name);
      const label = quote(node.name);
      if (node.kind === 'fragment')
        call(draft, 'part', label, fragment(node.structure, part + 'Fragment'));
      else if (node.kind === 'repeat') {
        const count = typeof node.count === 'string' ? quote(node.count) : node.count;
        call(
          draft,
          zen && typeof node.count === 'string' ? 'repeatParameter' : 'repeat',
          label,
          assembly(node.body, part + 'Repeat', part),
          count,
          numberArray(node.step),
        );
        for (const link of node.neighbor_links ?? [])
          call(
            draft,
            'neighbor',
            quote(link.from),
            quote(link.to),
            link.offset,
            zen ? order(link.type) : bondType(link.type),
          );
        if (node.head && node.tail)
          call(
            draft,
            'endGroups',
            assembly(node.head, part + 'HeadCap', part + 'Head'),
            assembly(node.tail, part + 'TailCap', part + 'Tail'),
          );
      } else if (node.kind === 'choice') {
        const parameter = typeof node.probability === 'string';
        call(
          draft,
          zen && parameter ? 'choiceParameter' : 'choice',
          label,
          quote(node.rule_id),
          parameter ? quote(node.probability) : decimal(node.probability),
          assembly(node.present, part + 'Present', part + 'Present'),
          assembly(node.absent, part + 'Absent', part + 'Absent'),
        );
      } else {
        throw new Error('Unsupported guide assembly node: ' + node.kind);
      }
      transform(draft, node.transform);
    }
    for (const link of shape.links ?? [])
      call(
        draft,
        'link',
        quote(link.from),
        quote(link.to),
        zen ? order(link.type) : bondType(link.type),
      );
    return letValue(name, draft + '.build()');
  };

  if (groovy) letValue('molecules', 'mods.avogadro.molecules');
  if (id === null) {
    const name = camelCase(fragmentName);
    fragment(definition, name, !zen && !groovy);
    const method = 'build' + capitalize(name);
    if (zen) return 'import mods.avogadro.Molecules;\n\n' + lines.join('\n');
    const imports =
      'import io.github.wurtzitane.avogadro.api.*' +
      semicolon +
      '\n' +
      'import io.github.wurtzitane.avogadro.molecule.BondType' +
      semicolon;
    const body = lines.map((line) => '    ' + line).join('\n');
    if (groovy) return imports + '\n\n' + lines.join('\n');
    if (kotlin) return imports + '\n\nfun ' + method + '(): StructureFragment {\n' + body + '\n}';
    if (scala)
      return (
        imports +
        '\n\nobject FragmentExample {\n  def ' +
        method +
        '(): StructureFragment = {\n' +
        body +
        '\n  }\n}'
      );
    return (
      imports +
      '\n\npublic class FragmentExample {\n    public static StructureFragment ' +
      method +
      '() {\n' +
      lines.map((line) => '        ' + line).join('\n') +
      '\n    }\n}'
    );
  }
  const model = letValue(
    'molecule',
    (zen ? 'Molecules.molecule' : groovy ? 'molecules.builder' : 'AvogadroApi.builder') +
      '(' +
      quote(id) +
      ')',
  );
  for (const [field, method] of [
    ['name', 'name'],
    ['smiles', 'smiles'],
    ['copy', 'copy'],
    ['formula', 'formula'],
  ])
    if (field in definition) call(model, method, quote(definition[field]));
  for (const [field, method] of [
    ['generate_item', 'generateItem'],
    ['match_containers', 'matchContainers'],
  ])
    if (field in definition) call(model, method, definition[field]);
  for (const [field, method, zenMethod] of [
    ['items', 'items', 'itemSelector'],
    ['fluids', 'fluids', 'fluidSelector'],
    ['components', 'component', 'component'],
    ['materials', 'materials', 'material'],
  ]) {
    if (!definition[field]) continue;
    if (zen || field === 'components')
      for (const value of definition[field]) call(model, zen ? zenMethod : method, quote(value));
    else call(model, method, ...definition[field].map(quote));
  }
  if (definition.atoms)
    call(model, zen ? 'geometry' : 'structure', fragment(definition, 'coordinates'));
  if (definition.structure) {
    const structure = definition.structure;
    if (structure.assembly)
      call(model, zen ? 'assembly' : 'structure', assembly(structure.assembly, 'moleculeAssembly'));
    else call(model, zen ? 'geometry' : 'structure', fragment(structure, 'moleculeGeometry'));
  }
  for (const [symbol, value] of Object.entries(definition.elements ?? {}))
    call(
      model,
      'element',
      quote(symbol),
      value.atomic_number,
      value.neutrons,
      ...(zen ? [numberArray(value.electron_shells, 'int')] : value.electron_shells),
    );
  for (const [index, value] of Object.entries(definition.atom_configurations ?? {}))
    nuclear(model, index, value);
  for (const [index, value] of Object.entries(definition.atom_annotations ?? {}))
    if (value.radical_electrons !== undefined)
      call(model, 'radical', index, value.radical_electrons);
  for (const [key, value] of Object.entries(definition.inspection ?? {})) {
    if (key === 'classification')
      call(
        model,
        'classification',
        zen ? quote(value) : 'MoleculeClassification.' + value.toUpperCase(),
      );
    else call(model, zen ? 'inspection' : 'inspectionMetadata', quote(key), quote(value));
  }
  if (definition.crystal) {
    const cell = definition.crystal;
    const values = [
      cell.a,
      cell.b,
      cell.c,
      cell.alpha,
      cell.beta,
      cell.gamma,
      cell.origin_x ?? 0,
      cell.origin_y ?? 0,
      cell.origin_z ?? 0,
    ].map(decimal);
    call(model, 'crystalCell', ...(zen ? values : [construct('CrystalCell', ...values)]));
  }
  if (definition.constraints) {
    const draft = zen ? model : letValue('constraints', 'StructureConstraints.builder()');
    for (const rule of definition.constraints)
      call(
        draft,
        rule.type === 'dihedral' ? 'dihedral' : 'bondLength',
        ...rule.atoms,
        decimal(rule.degrees ?? rule.length),
      );
    if (!zen) call(model, 'constraints', draft + '.build()');
  }
  if (definition.edits) {
    const draft = zen
      ? model
      : letValue('edits', groovy ? 'molecules.edits()' : 'StructureEdits.builder()');
    for (const edit of definition.edits) {
      if (edit.op === 'replaceAtom') call(draft, edit.op, edit.index, quote(edit.e));
      else if (edit.op === 'atom' || edit.op === 'moveAtom')
        call(
          draft,
          zen && edit.op === 'atom' ? 'appendAtom' : edit.op,
          edit.index ?? quote(edit.e),
          ...[edit.x, edit.y, edit.z].map(decimal),
        );
      else if (edit.op === 'setBond')
        call(draft, edit.op, edit.from, edit.to, zen ? order(edit.type) : bondType(edit.type));
      else throw new Error('Unsupported guide edit: ' + edit.op);
    }
    if (!zen) call(model, 'edits', draft + '.build()');
  }
  if (definition.polymer) {
    const polymer = definition.polymer;
    const unit = fragment(polymer.repeat_unit, 'repeatUnit');
    const head = fragment(polymer.head_cap.structure, 'headCap');
    const tail = fragment(polymer.tail_cap.structure, 'tailCap');
    const translation = polymer.translation.map(decimal);
    if (zen)
      call(
        model,
        'polymer',
        unit,
        polymer.head,
        polymer.tail,
        ...translation,
        order(polymer.link_type),
        head,
        polymer.head_cap.attachment,
        order(polymer.head_cap.bond_type),
        tail,
        polymer.tail_cap.attachment,
        order(polymer.tail_cap.bond_type),
        polymer.preview_units,
      );
    else
      call(
        model,
        'polymer',
        construct(
          'PolymerDefinition',
          unit,
          polymer.head,
          polymer.tail,
          construct('PolymerDefinition.Vector', ...translation),
          bondType(polymer.link_type),
          construct(
            'PolymerDefinition.Cap',
            head,
            polymer.head_cap.attachment,
            bondType(polymer.head_cap.bond_type),
          ),
          construct(
            'PolymerDefinition.Cap',
            tail,
            polymer.tail_cap.attachment,
            bondType(polymer.tail_cap.bond_type),
          ),
          polymer.preview_units,
        ),
      );
  }
  if (definition.polymer_network) {
    const network = definition.polymer_network;
    const geometry = assembly(network.assembly, 'networkAssembly');
    const seed = String(network.seed) + (zen ? '' : 'L');
    if (zen) {
      const draft = letValue('network', 'Molecules.network(' + geometry + ')');
      for (const parameter of network.parameters) {
        if (parameter.kind === 'count')
          call(
            draft,
            'count',
            quote(parameter.name),
            parameter.min,
            parameter.max,
            parameter.default,
          );
        else call(draft, 'probability', quote(parameter.name), decimal(parameter.default));
      }
      call(draft, 'seed', seed);
      call(model, 'network', draft + '.build()');
    } else {
      const parameters = network.parameters.map((parameter) =>
        construct(
          'PolymerNetworkDefinition.Parameter',
          quote(parameter.name),
          quote(parameter.label),
          quote(parameter.kind),
          ...[parameter.min, parameter.max, parameter.default].map(decimal),
        ),
      );
      call(
        model,
        'polymerNetwork',
        construct(
          'PolymerNetworkDefinition',
          'java.util.List.of(' + args(parameters) + ')',
          geometry,
          seed,
        ),
      );
    }
  }

  if (zen) call(model, 'register');
  else if (groovy) call('molecules', 'register', model);
  else call('AvogadroApi.owner(' + quote(id.split(':')[0]) + ')', 'register', model);
  const api =
    'import io.github.wurtzitane.avogadro.api.*' +
    semicolon +
    '\n' +
    'import io.github.wurtzitane.avogadro.molecule.BondType' +
    semicolon;
  if (zen) return 'import mods.avogadro.Molecules;\n\n' + lines.join('\n');
  if (groovy) return api + '\n\n' + lines.join('\n');
  const indent = (size) => lines.map((line) => ' '.repeat(size) + line).join('\n');
  if (kotlin) return api + '\n\nfun registerMolecule() {\n' + indent(4) + '\n}';
  if (scala)
    return (
      api + '\n\nobject ExampleMolecule {\n  def register(): Unit = {\n' + indent(4) + '\n  }\n}'
    );
  return (
    api +
    '\n\npublic class ExampleMolecule {\n    public static void register() {\n' +
    indent(8) +
    '\n    }\n}'
  );
}

function addMoleculeRegistrationExamples(guide) {
  for (const original of guide.querySelectorAll('[data-register-example]')) {
    const source =
      original.dataset.registerDefinition ||
      original.querySelector('code.language-json')?.textContent;
    if (!source) continue;
    const id = original.dataset.registerExample;
    const primary = registrationExample(id, JSON.parse(source), null);
    original.after(primary);
    original.hidden = true;
    let previous = primary;
    if (original.dataset.smilesExample) {
      previous = registrationExample(id, JSON.parse(original.dataset.smilesExample), 'smiles');
      primary.after(previous);
    }
    if (original.dataset.coordinateExample) {
      previous.after(
        registrationExample(id, JSON.parse(original.dataset.coordinateExample), 'coordinates'),
      );
    }
  }
}

function registrationExample(id, definition, method) {
  const recipe = document.createElement('div');
  recipe.className = 'av-example-group';
  recipe.dataset.example = 'registration-' + id + (method ? '-' + method : '');
  recipe.dataset.defaultLanguage = 'json';
  const heading = document.createElement('h3');
  heading.textContent =
    { smiles: 'Register from SMILES', coordinates: 'Register with explicit coordinates' }[method] ||
    'Register ' + id;
  recipe.append(heading);
  const note = document.createElement('p');
  note.textContent =
    'For a pack, save the JSON under data/' +
    id.replace(':', '/molecules/') +
    '.json. For an addon or script, pick your language.';
  recipe.append(note);
  for (const [language, snippet] of Object.entries(moleculeRegistrationSources(id, definition))) {
    const pre = document.createElement('pre');
    pre.dataset.language = language;
    const code = document.createElement('code');
    code.className = 'language-' + language;
    code.textContent = snippet;
    pre.append(code);
    recipe.append(pre);
  }
  return recipe;
}

function addOperationExamples(guide) {
  const namespace = 'io.github.wurtzitane.avogadro.';
  const client = ['import mods.avogadro.Client;'];
  const molecules = ['import mods.avogadro.Molecules;'];
  const exportOperation = (
    title,
    method,
    parameters,
    count,
    options,
    request,
    zenLines,
    extraImports = [],
  ) => ({
    title,
    method,
    type: 'MediaExportJob',
    args: parameters,
    imports: [
      namespace + 'api.client.*',
      namespace + 'client.export.ExportOptions',
      namespace + 'molecule.MoleculeDef',
      ...extraImports,
    ],
    throws: 'java.io.IOException',
    lines: [
      'VAR options = ExportOptions.builder(' + count + ').' + options + '.build()',
      'return AvogadroClientApi.exports().submit(' + request + ')',
    ],
    zen: [...client, ...zenLines],
  });
  const timing = '.fps(20).secondsPerRotation(3.0).background(0xf8f7f2)';
  const zenTiming = '.timing(20, 3.0).background(0xf8f7f2)';
  const renderImports = [namespace + 'api.client.*', namespace + 'molecule.MoleculeStructure'];
  const style =
    'MoleculeRenderOptions.builder().orientation(25.0f, 20.0f, 0.0f).pan(0.0f, 0.0f).zoom(1.0f)' +
    '.background(-460814).atomScale(1.15f).bondScale(0.7f)' +
    '.palette(java.util.Map.of("O", 0xe45b55)).rotationSpeed(30.0).build()';
  const zenStyle =
    'Client.renderSettings().orientation(25.0, 20.0, 0.0).zoom(1.0)' +
    '.background(' +
    (0xfff8f7f2 | 0) +
    ').modelScale(1.15, 0.7).elementColor("O", 0xe45b55).rotationSpeed(30.0)';
  const operations = {
    'registration-completion': {
      title: 'Watch a registration job',
      method: 'watchRegistration',
      type: 'void',
      args: [['job', 'RegistrationJob']],
      imports: [namespace + 'api.RegistrationJob'],
      lines: [
        'job.completion().whenComplete((view, error) -> System.out.println(error == null ? "Registered: " + view.all().size() : error.getMessage()))',
      ],
      groovy: [
        'import io.github.wurtzitane.avogadro.api.RegistrationJob',
        '',
        'void watchRegistration(RegistrationJob job) {',
        '    job.completion().whenComplete { view, error ->',
        '        println(error == null ? "Registered: " + view.all().size() : error.message)',
        '    }',
        '}',
      ],
      native: {
        kotlin: [
          'import io.github.wurtzitane.avogadro.api.RegistrationJob',
          'import io.github.wurtzitane.avogadro.kotlin.AvogadroCoroutines.awaitCompletion',
          '',
          'suspend fun watchRegistration(job: RegistrationJob) {',
          '    val view = job.completion().awaitCompletion()',
          '    println("Registered: " + view.all().size)',
          '}',
        ],
        scala: [
          'import io.github.wurtzitane.avogadro.api.RegistrationJob',
          'import io.github.wurtzitane.avogadro.scala.Avogadro.*',
          'import scala.concurrent.ExecutionContext',
          '',
          'def watchRegistration(job: RegistrationJob)(using ExecutionContext): Unit = {',
          '  job.completionFuture.onComplete(result => println(result))',
          '}',
        ],
      },
      zen: [
        'import mods.avogadro.RegistrationJob;',
        '',
        'function watchRegistration(job as RegistrationJob) {',
        '    job.onComplete(function(done as RegistrationJob) {',
        '        print("Registration " + done.state);',
        '        if (done.failure != "") { print(done.failure); }',
        '    });',
        '}',
      ],
    },
    tags: {
      title: 'Bind a molecule through item and fluid tags',
      method: 'taggedWater',
      type: 'MoleculeBatch',
      args: [],
      imports: [namespace + 'api.AvogadroApi', namespace + 'api.MoleculeBatch'],
      lines: [
        'VAR water = AvogadroApi.builder("guide:tagged_water").smiles("[H]O[H]")',
        'water.itemTags("guide:water_containers").fluidTags("guide:water")',
        'VAR batch = NEW MoleculeBatch()',
        'batch.itemTag("guide:water_containers", false, "minecraft:water_bucket").fluidTag("guide:water", false, "water")',
        'return batch.register(water)',
      ],
      groovy: [
        'def molecules = mods.avogadro.molecules',
        'def water = molecules.builder("guide:tagged_water").smiles("[H]O[H]")',
        'water.itemTags("guide:water_containers").fluidTags("guide:water")',
        'molecules.batch {',
        '    itemTag("guide:water_containers", false, ["minecraft:water_bucket"])',
        '    fluidTag("guide:water", false, ["water"])',
        '    register(water)',
        '}',
      ],
      zen: [
        ...molecules,
        '',
        'val water = Molecules.molecule("guide:tagged_water").smiles("[H]O[H]");',
        'water.itemTag("guide:water_containers").fluidTag("guide:water");',
        'val batch = Molecules.transaction("guide");',
        'batch.itemTag("guide:water_containers", false, ["minecraft:water_bucket"]);',
        'batch.fluidTag("guide:water", false, ["water"]);',
        'batch.register(water).commit();',
      ],
    },
    'stereo-label': {
      title: 'Look up an atom’s R/S label',
      method: 'stereoLabel',
      type: 'String',
      args: [
        ['id', 'String'],
        ['atom', 'int'],
      ],
      imports: [namespace + 'api.AvogadroApi'],
      lines: [
        'VAR definition = AvogadroApi.registeredView().get(id)',
        'VAR label = definition == null ? null : definition.structure().stereochemistry().get(atom)',
        'return label == null ? "" : label.name()',
      ],
      kotlin: [
        'val definition = AvogadroApi.registeredView().get(id)',
        'return definition?.structure()?.stereochemistry()?.get(atom)?.name ?: ""',
      ],
      scala: [
        'val definition = AvogadroApi.registeredView().get(id)',
        'return Option(definition).flatMap(d => Option(d.structure().stereochemistry().get(atom))).map(_.name()).getOrElse("")',
      ],
      zen: [
        ...molecules,
        '',
        'function stereoLabel(id as string, atom as int) as string {',
        '    return Molecules.stereoLabel(id, atom);',
        '}',
      ],
    },
    'r-group': {
      title: 'Add a labelled substituent attachment',
      method: 'substituent',
      type: 'StructureFragment',
      args: [],
      imports: [namespace + 'api.StructureBuilder', namespace + 'api.StructureFragment'],
      lines: [
        'VAR part = NEW StructureBuilder()',
        'VAR group = part.addRGroup("R1", 0.0, 0.0, 0.0)',
        'VAR carbon = part.addAtom("C", 1.5, 0.0, 0.0)',
        'return part.bond(group, carbon).attachment("side_chain", group).build()',
      ],
      zen: [
        ...molecules,
        '',
        'val part = Molecules.fragment().rGroup("R1", 0.0, 0.0, 0.0).atom("C", 1.5, 0.0, 0.0);',
        'val fragment = part.bond(0, 1, 1).attachment("side_chain", 0).build();',
      ],
    },
    'palette-layer': {
      title: 'Replace, patch, or remove an owner’s palette',
      method: 'setPalette',
      type: 'void',
      args: [['owner', 'String']],
      imports: [namespace + 'api.ElementColors', 'java.util.Map'],
      lines: [
        'ElementColors.replace(owner, 20, Map.of("C", 0x365E9D, "O", 0xE99A24))',
        'ElementColors.patch(owner, Map.of("H", 0xE8EAF0))',
        '// Later, when disabling the feature:',
        '// ElementColors.remove(owner)',
      ],
      scala: [
        'ElementColors.replace(owner, 20, Map.of("C", Int.box(0x365E9D), "O", Int.box(0xE99A24)))',
        'ElementColors.patch(owner, Map.of("H", Int.box(0xE8EAF0)))',
        '// Later: ElementColors.remove(owner)',
      ],
      zen: [
        ...molecules,
        '',
        'val owner = "my_mod:atom_colors";',
        'Molecules.replaceColors(owner, 20, {"C": 0x365E9D, "O": 0xE99A24});',
        'Molecules.patchColors(owner, {"H": 0xE8EAF0});',
        '// Later: Molecules.removeColors(owner);',
      ],
    },
    'palette-reload': {
      title: 'Reload element colors and report the result',
      method: 'reloadPalette',
      type: 'void',
      args: [['report', 'Consumer<String>']],
      imports: [namespace + 'api.client.AvogadroClientApi', 'java.util.function.Consumer'],
      lines: [
        'AvogadroClientApi.reloadElementColors().whenComplete((palette, failure) -> report.accept(failure == null ? "Palette revision: " + palette.revision() : failure.toString()))',
      ],
      kotlin: [
        'AvogadroClientApi.reloadElementColors().whenComplete { palette, failure ->',
        '    report.accept(if (failure == null) "Palette revision: " + palette.revision() else failure.toString())',
        '}',
      ],
      scala: [
        'AvogadroClientApi.reloadElementColors().whenComplete((palette, failure) => report.accept(if (failure == null) "Palette revision: " + palette.revision() else failure.toString))',
      ],
      groovy: [
        'import io.github.wurtzitane.avogadro.api.client.AvogadroClientApi',
        'import java.util.function.Consumer',
        '',
        'def reloadPalette(Consumer<String> report) {',
        '    AvogadroClientApi.reloadElementColors().whenComplete { palette, failure ->',
        '        report.accept(failure == null ? "Palette revision: " + palette.revision() : failure.toString())',
        '    }',
        '}',
      ],
      zen: [
        ...client,
        '',
        'Client.reloadElementColors(function(revision as long, error as string) {',
        '    if (error == "") { print("Palette revision: " + revision); }',
        '    else { print(error); }',
        '});',
      ],
    },
    'palette-preview': {
      title: 'Set the palette for one preview',
      method: 'previewColors',
      type: 'MoleculeRenderOptions',
      args: [],
      imports: [namespace + 'api.client.MoleculeRenderOptions', 'java.util.Map'],
      lines: [
        'return MoleculeRenderOptions.builder().palette(Map.of("C", 0x365E9D, "O", 0xE99A24)).build()',
      ],
      scala: [
        'return MoleculeRenderOptions.builder().palette(Map.of("C", Int.box(0x365E9D), "O", Int.box(0xE99A24))).build()',
      ],
      zen: [
        ...client,
        '',
        'val settings = Client.renderSettings().elementColor("C", 0x365E9D).elementColor("O", 0xE99A24);',
      ],
    },
    'theme-color': {
      title: 'Read a color from an installed theme',
      method: 'titleColor',
      type: 'int',
      args: [['themeId', 'String']],
      imports: [namespace + 'client.UiThemes'],
      lines: [
        'VAR theme = UiThemes.available().get(themeId)',
        'return theme == null ? 0xFF3F3A30 : theme.compiled().color("text.primary", "atom_examiner", "root/title", 0xFF3F3A30)',
      ],
      kotlin: [
        'val theme = UiThemes.available().get(themeId)',
        'return theme?.compiled()?.color("text.primary", "atom_examiner", "root/title", 0xFF3F3A30.toInt()) ?: 0xFF3F3A30.toInt()',
      ],
      scala: [
        'val theme = UiThemes.available().get(themeId)',
        'return if (theme == null) 0xFF3F3A30 else theme.compiled().color("text.primary", "atom_examiner", "root/title", 0xFF3F3A30)',
      ],
      zen: [
        ...client,
        '',
        'val color = Client.themeColor("default_theme", "text.primary", "atom_examiner", "root/title", 0xFF3F3A30);',
      ],
    },
    'stack-matching': {
      title: 'Match a tagged fluid stack',
      method: 'taggedWater',
      type: 'MoleculeSpec',
      args: [['water', 'Fluid']],
      imports: [
        namespace + 'api.AvogadroApi',
        namespace + 'api.MoleculeSpec',
        'net.minecraftforge.fluids.Fluid',
        'net.minecraftforge.fluids.FluidStack',
        'net.minecraft.nbt.NBTTagCompound',
      ],
      lines: [
        'VAR tag = NEW NBTTagCompound()',
        'tag.setString("Grade", "pure")',
        'VAR stack = NEW FluidStack(water, 1000, tag)',
        'return AvogadroApi.builder("guide:pure_water").smiles("[H]O[H]").fluids(stack).build()',
      ],
      zen: [
        ...molecules,
        'import crafttweaker.liquid.ILiquidStack;',
        'import mods.avogadro.Definition;',
        '',
        'function taggedWater(water as ILiquidStack) as Definition {',
        '    return Molecules.molecule("guide:pure_water").smiles("[H]O[H]").fluidWithStringTag(water, "Grade", "pure");',
        '}',
      ],
    },
    'matching-batch': {
      title: 'Publish the water definition in a batch',
      method: 'registerWater',
      type: 'CompletableFuture<MoleculeView>',
      args: [],
      imports: [
        namespace + 'api.AvogadroApi',
        namespace + 'api.MoleculeBatch',
        namespace + 'api.MoleculeView',
        'java.util.concurrent.CompletableFuture',
      ],
      lines: [
        'VAR water = AvogadroApi.builder("guide:water").name("Water").smiles("[H]O[H]")',
        'water.items("minecraft:water_bucket").fluids("water").generateItem(true)',
        'return AvogadroApi.owner("guide").replace(NEW MoleculeBatch().register(water))',
      ],
      groovy: [
        'def molecules = mods.avogadro.molecules',
        'def water = molecules.builder("guide:water").name("Water").smiles("[H]O[H]")',
        'water.items("minecraft:water_bucket").fluids("water").generateItem(true)',
        'molecules.batch { register(water) }',
      ],
      zen: [
        ...molecules,
        '',
        'val water = Molecules.molecule("guide:water").name("Water").smiles("[H]O[H]");',
        'water.itemSelector("minecraft:water_bucket").fluidSelector("water").generateItem(true);',
        'Molecules.transaction("guide").replaceAll().register(water).commit();',
      ],
    },
    catalog: {
      title: 'Collect definitions for the catalog',
      method: 'catalog',
      type: 'MoleculeBatch',
      args: [['definitions', 'List<MoleculeBuilder>']],
      imports: [
        namespace + 'api.MoleculeBatch',
        namespace + 'api.MoleculeBuilder',
        'java.util.List',
      ],
      lines: [
        'VAR batch = NEW MoleculeBatch()',
        'definitions.forEach(batch::register)',
        'return batch',
      ],
      scala: [
        'val batch = new MoleculeBatch()',
        'definitions.forEach(definition => { batch.register(definition); () })',
        'return batch',
      ],
      groovy: [
        'import io.github.wurtzitane.avogadro.api.MoleculeBatch',
        'import io.github.wurtzitane.avogadro.api.MoleculeBuilder',
        '',
        'def catalog(List<MoleculeBuilder> definitions) {',
        '    def batch = new MoleculeBatch()',
        '    definitions.each { batch.register(it) }',
        '    return batch',
        '}',
      ],
      zen: [
        ...molecules,
        'import mods.avogadro.Definition;',
        'import mods.avogadro.Transaction;',
        '',
        'function catalog(definitions as Definition[]) as Transaction {',
        '    val batch = Molecules.transaction("guide").replaceAll();',
        '    for definition in definitions { batch.register(definition); }',
        '    return batch;',
        '}',
      ],
    },
    batch: {
      title: 'Publish the selected catalog',
      method: 'registerCatalog',
      type: 'CompletableFuture<MoleculeView>',
      args: [['catalog', 'MoleculeBatch']],
      imports: [
        namespace + 'api.AvogadroApi',
        namespace + 'api.MoleculeBatch',
        namespace + 'api.MoleculeView',
        'java.util.concurrent.CompletableFuture',
      ],
      lines: ['return AvogadroApi.owner("guide").replace(catalog)'],
      groovy: [
        'import io.github.wurtzitane.avogadro.api.MoleculeBuilder',
        '',
        'def registerCatalog(List<MoleculeBuilder> definitions) {',
        '    mods.avogadro.molecules.batch {',
        '        definitions.each { definition -> register(definition) }',
        '    }',
        '}',
      ],
      zen: [
        'import mods.avogadro.Transaction;',
        '',
        'function registerCatalog(catalog as Transaction) {',
        '    catalog.commit();',
        '}',
      ],
    },
    realization: {
      title: 'Realize a network with chosen parameters',
      method: 'realize',
      type: 'PolymerPreview',
      args: [
        ['network', 'PolymerNetworkDefinition'],
        ['length', 'int'],
        ['chance', 'double'],
        ['seed', 'long'],
      ],
      imports: [
        namespace + 'api.PolymerNetworkDefinition',
        namespace + 'api.PolymerPreview',
        namespace + 'api.NetworkPreviewRequest',
        'java.util.Map',
      ],
      lines: [
        'return network.preview(NEW NetworkPreviewRequest(Map.of("length", length), Map.of("bridgeChance", chance), seed))',
      ],
      scala: [
        'return network.preview(NEW NetworkPreviewRequest(Map.of("length", Int.box(length)), Map.of("bridgeChance", Double.box(chance)), seed))',
      ],
      zen: [
        'import mods.avogadro.Network;',
        'import mods.avogadro.Geometry;',
        '',
        'function realize(network as Network, length as int, chance as double, seed as long) as Geometry {',
        '    return network.request().count("length", length).probability("bridgeChance", chance).seed(seed).realize();',
        '}',
      ],
    },
    'saved-edits': {
      title: 'Save reusable peroxide edits',
      method: 'hydrogenPeroxideEdits',
      type: 'StructureEdits',
      args: [],
      imports: [namespace + 'api.StructureEdits', namespace + 'molecule.BondType'],
      lines: [
        'VAR edits = StructureEdits.builder().replaceAtom(2, "O").moveAtom(2, -0.9, -0.95, 0.0)',
        'edits.atom("H", -1.65, -0.6, 0.4).setBond(2, 3, BondType.SINGLE)',
        'return edits.build()',
      ],
      zen: [
        ...molecules,
        'import mods.avogadro.SavedEdits;',
        '',
        'function hydrogenPeroxideEdits() as SavedEdits {',
        '    val edits = Molecules.edits().replaceAtom(2, "O").moveAtom(2, -0.9, -0.95, 0.0);',
        '    return edits.atom("H", -1.65, -0.6, 0.4).setBond(2, 3, 1);',
        '}',
      ],
    },
    'definition-edit': {
      title: 'Apply saved edits to a definition',
      method: 'peroxide',
      type: 'MoleculeDef',
      args: [
        ['water', 'MoleculeDef'],
        ['edits', 'StructureEdits'],
      ],
      imports: [
        namespace + 'api.StructureEdits',
        namespace + 'api.MoleculeEdits',
        namespace + 'molecule.MoleculeDef',
      ],
      lines: ['return MoleculeEdits.apply("guide:peroxide", water, edits, false)'],
      zen: [
        ...molecules,
        'import mods.avogadro.SavedEdits;',
        'import mods.avogadro.Definition;',
        '',
        'function peroxide(sourceId as string, edits as SavedEdits) as Definition {',
        '    return Molecules.molecule("guide:peroxide").copy(sourceId).edits(edits);',
        '}',
      ],
    },
    'random-links': {
      title: 'Link two reactive sites with a probability',
      method: 'reactiveSites',
      type: 'PolymerNetworkDefinition',
      args: [],
      imports: [
        namespace + 'api.StructureBuilder',
        namespace + 'api.StructureAssembly',
        namespace + 'api.PolymerNetworkDefinition',
        namespace + 'molecule.BondType',
        'java.util.List',
      ],
      lines: [
        'VAR left = NEW StructureBuilder().atom("O", -0.7, 0.0, 0.0).atom("H", -1.1, 0.85, 0.0).bond(0, 1).attachment("site", 0).attachment("alias", 0).randomLinkCapacity(0, 1).build()',
        'VAR right = NEW StructureBuilder().atom("O", 0.7, 0.0, 0.0).atom("H", 1.1, -0.85, 0.0).bond(0, 1).attachment("site", 0).randomLinkCapacity(0, 1).build()',
        'VAR assembly = StructureAssembly.builder().part("left", left).part("right", right).randomLinks("peroxide_bond", "left/site", "right/site", "paired", "chance", BondType.SINGLE).build()',
        'return NEW PolymerNetworkDefinition(List.of(PolymerNetworkDefinition.Parameter.probability("chance", 1.0)), assembly, 42L)',
      ],
      kotlin: [
        'val left = StructureBuilder().atom("O", -0.7, 0.0, 0.0).atom("H", -1.1, 0.85, 0.0).bond(0, 1).attachment("site", 0).attachment("alias", 0).randomLinkCapacity(0, 1).build()',
        'val right = StructureBuilder().atom("O", 0.7, 0.0, 0.0).atom("H", 1.1, -0.85, 0.0).bond(0, 1).attachment("site", 0).randomLinkCapacity(0, 1).build()',
        'val assembly = StructureAssembly.builder().part("left", left).part("right", right).randomLinks("peroxide_bond", "left/site", "right/site", "paired", "chance", BondType.SINGLE).build()',
        'return PolymerNetworkDefinition(listOf(PolymerNetworkDefinition.Parameter.probability("chance", 1.0)), assembly, 42L)',
      ],
      zen: [
        ...molecules,
        '',
        'val left = Molecules.fragment().atom("O", -0.7, 0.0, 0.0).atom("H", -1.1, 0.85, 0.0)',
        '    .bond(0, 1, 1).attachment("site", 0).attachment("alias", 0).randomLinkCapacity(0, 1).build();',
        'val right = Molecules.fragment().atom("O", 0.7, 0.0, 0.0).atom("H", 1.1, -0.85, 0.0)',
        '    .bond(0, 1, 1).attachment("site", 0).randomLinkCapacity(0, 1).build();',
        'val assembly = Molecules.assembly().part("left", left).part("right", right)',
        '    .randomLinksParameter("peroxide_bond", "left/site", "right/site", "paired", "chance", 1).build();',
        'val network = Molecules.network(assembly).probability("chance", 1.0).seed(42).build();',
      ],
    },
    crystal: {
      title: 'Repeat a rock-salt unit cell',
      method: 'saltCube',
      type: 'MoleculeStructure',
      args: [['basis', 'StructureFragment']],
      imports: [
        namespace + 'api.CrystalCell',
        namespace + 'api.CrystalGeometry',
        namespace + 'api.StructureFragment',
        namespace + 'molecule.MoleculeStructure',
      ],
      lines: [
        'VAR cell = NEW CrystalCell(5.64, 5.64, 5.64, 90.0, 90.0, 90.0)',
        'return CrystalGeometry.repeat(basis.toStructure("guide:salt_basis"), cell, 3, false)',
      ],
      zen: [
        'import mods.avogadro.Geometry;',
        '',
        'function saltCube(basis as Geometry) as Geometry {',
        '    return basis.repeatCrystal(3, 5.64, 5.64, 5.64, 90.0, 90.0, 90.0, false);',
        '}',
      ],
    },
    'render-options': {
      title: 'Set camera and model appearance',
      method: 'style',
      type: 'MoleculeRenderOptions',
      args: [],
      imports: renderImports,
      lines: ['return ' + style],
      zen: [...client, '', 'val style = ' + zenStyle + ';'],
    },
    still: {
      title: 'Draw a still preview',
      method: 'drawStill',
      type: 'void',
      args: [
        ['structure', 'MoleculeStructure'],
        ['x', 'int'],
        ['y', 'int'],
      ],
      imports: renderImports,
      lines: [
        'VAR style = MoleculeRenderOptions.builder().orientation(25.0f, 20.0f, 0.0f).rotationSpeed(0.0).build()',
        'AvogadroClientApi.render(structure, x, y, 240, 180, style, 0.0)',
      ],
      zen: [
        ...client,
        '',
        'function drawStill(id as string, x as int, y as int) {',
        '    val style = Client.renderSettings().orientation(25.0, 20.0, 0.0).rotationSpeed(0.0);',
        '    Client.render(id, x, y, 240, 180, style, 0.0);',
        '}',
      ],
    },
    draw: {
      title: 'Draw with the elapsed time from the render event',
      method: 'draw',
      type: 'void',
      args: [
        ['structure', 'MoleculeStructure'],
        ['elapsedSeconds', 'double'],
      ],
      imports: renderImports,
      lines: [
        'VAR style = ' + style,
        'AvogadroClientApi.render(structure, 20, 40, 320, 220, style, elapsedSeconds)',
      ],
      zen: [
        ...client,
        '',
        'function draw(id as string, elapsedSeconds as double) {',
        '    val style = ' + zenStyle + ';',
        '    Client.render(id, 20, 40, 320, 220, style, elapsedSeconds);',
        '}',
      ],
    },
    viewports: {
      title: 'Compare two styles side by side',
      method: 'compareStyles',
      type: 'void',
      args: [['structure', 'MoleculeStructure']],
      imports: renderImports,
      lines: [
        'VAR large = MoleculeRenderOptions.builder().atomScale(1.6f).bondScale(0.6f).build()',
        'VAR fine = MoleculeRenderOptions.builder().atomScale(0.8f).bondScale(1.2f).build()',
        'AvogadroClientApi.render(structure, 10, 30, 220, 180, large, 0.0)',
        'AvogadroClientApi.render(structure, 240, 30, 220, 180, fine, 0.0)',
      ],
      zen: [
        ...client,
        '',
        'function compareStyles(id as string) {',
        '    val large = Client.renderSettings().modelScale(1.6, 0.6);',
        '    val fine = Client.renderSettings().modelScale(0.8, 1.2);',
        '    Client.render(id, 10, 30, 220, 180, large, 0.0);',
        '    Client.render(id, 240, 30, 220, 180, fine, 0.0);',
        '}',
      ],
    },
    gif: exportOperation(
      'Export a molecule as GIF',
      'exportGif',
      [['aspirin', 'MoleculeDef']],
      '1',
      'size(960, 720)' + timing + '.filename("aspirin.gif")',
      'MediaExportRequest.molecule(aspirin).options(options).build()',
      [
        '',
        'val settings = Client.exportSettings(1).size(960, 720)' +
          zenTiming +
          '.filename("aspirin.gif");',
        'val job = Client.exportMolecule("guide:aspirin", settings);',
      ],
    ),
    gallery: exportOperation(
      'Export a gallery on one canvas',
      'exportGallery',
      [['molecules', 'List<MoleculeDef>']],
      'molecules.size()',
      'size(1920, 1280).columns(3)' + timing + '.filename("gallery.gif")',
      'MediaExportRequest.molecules(molecules).options(options).build()',
      [
        '',
        'val ids = ["guide:water", "guide:methanol", "guide:ethanol"];',
        'val settings = Client.exportSettings(3).size(1920, 1280).columns(3)' +
          zenTiming +
          '.filename("gallery.gif");',
        'val job = Client.exportGallery(ids, settings);',
      ],
      ['java.util.List'],
    ),
    mp4: exportOperation(
      'Export a molecule as MP4',
      'exportMp4',
      [
        ['caffeine', 'MoleculeDef'],
        ['ffmpeg', 'Path'],
      ],
      '1',
      'format(ExportOptions.Format.MP4).size(1920, 1080).fps(24).secondsPerRotation(3.0).background(0xf8f7f2).encoder(ffmpeg.toString()).filename("caffeine.mp4")',
      'MediaExportRequest.molecule(caffeine).options(options).build()',
      [
        'import mods.avogadro.ExportJob;',
        '',
        'function exportMp4(ffmpeg as string) as ExportJob {',
        '    val settings = Client.exportSettings(1).mp4(ffmpeg).size(1920, 1080).timing(24, 3.0)',
        '        .background(0xf8f7f2).filename("caffeine.mp4");',
        '    return Client.exportMolecule("guide:caffeine", settings);',
        '}',
      ],
      ['java.nio.file.Path'],
    ),
    'atom-export': exportOperation(
      'Export an atom with its information card',
      'exportAtom',
      [['water', 'MoleculeDef']],
      '1',
      'size(1280, 800)' + timing + '.filename("oxygen.gif")',
      'MediaExportRequest.atom(ATOM_OPTIONS).options(options).build()',
      [
        '',
        'val settings = Client.exportSettings(1).size(1280, 800)' +
          zenTiming +
          '.filename("oxygen.gif");',
        'val job = Client.exportAtom("guide:water", 0, true, settings);',
      ],
      [namespace + 'client.export.AtomExportOptions'],
    ),
    'item-card': exportOperation(
      'Export an item card',
      'exportItemCard',
      [['held', 'ItemStack']],
      '1',
      'size(1200, 800)' +
        timing +
        '.showName(true).showFormula(true).textScale(2.0).filename("water-card.gif")',
      'MediaExportRequest.item(ItemExportOptions.of(ItemExportSelection.select("held", null, held), options, 2)).build()',
      [
        'import crafttweaker.item.IItemStack;',
        'import mods.avogadro.ExportJob;',
        '',
        'function exportItemCard(held as IItemStack) as ExportJob {',
        '    val settings = Client.exportSettings(1).size(1200, 800)' + zenTiming,
        '        .labels(true, true, 2.0).filename("water-card.gif");',
        '    return Client.exportItem(held, 2, settings);',
        '}',
      ],
      [
        'net.minecraft.item.ItemStack',
        namespace + 'client.export.ItemExportSelection',
        namespace + 'client.export.ItemExportOptions',
      ],
    ),
    'network-export': exportOperation(
      'Export a specific network realization',
      'exportNetwork',
      [['preview', 'PolymerPreview']],
      '1',
      'size(1280, 720)' + timing + '.filename("polyisoprene.gif")',
      'MediaExportRequest.polymer(preview, "Sulfur-linked polyisoprene").options(options).build()',
      [
        '',
        'val request = Client.networkRequest("guide:rubber")',
        '    .count("length", 4).probability("bridgeChance", 0.5).seed(42);',
        'val settings = Client.exportSettings(1).size(1280, 720)' +
          zenTiming +
          '.filename("polyisoprene.gif");',
        'val job = Client.exportRealization(request, "Sulfur-linked polyisoprene", settings);',
      ],
      [namespace + 'api.PolymerPreview'],
    ),
    'finite-export': exportOperation(
      'Export a finite model without registering it',
      'exportUnregistered',
      [['structure', 'MoleculeStructure']],
      '1',
      'filename("finite-model.gif")',
      'MediaExportRequest.structure(structure, "Finite authored model", MoleculeLoader.formula(structure), null).options(options).build()',
      [
        'import mods.avogadro.ExportJob;',
        'import mods.avogadro.Geometry;',
        '',
        'function exportUnregistered(geometry as Geometry) as ExportJob {',
        '    val settings = Client.exportSettings(1).filename("finite-model.gif");',
        '    return Client.exportGeometry(geometry, "Finite authored model", settings);',
        '}',
      ],
      [namespace + 'molecule.MoleculeStructure', namespace + 'molecule.MoleculeLoader'],
    ),
    exclusion: {
      title: 'Exclude an item from automatic tooltip previews',
      method: 'hideAutomaticPreview',
      type: 'void',
      args: [],
      imports: [namespace + 'api.AvogadroApi', 'net.minecraft.util.ResourceLocation'],
      lines: ['AvogadroApi.excludeItemTooltip(NEW ResourceLocation("minecraft:water_bucket"))'],
      zen: [...molecules, '', 'Molecules.excludeItemTooltip("minecraft:water_bucket");'],
    },
    tooltip: {
      title: 'Draw a tooltip with the exact fluid stack',
      method: 'fluidTooltip',
      type: 'void',
      args: [
        ['contents', 'FluidStack'],
        ['drawTooltip', 'Runnable'],
      ],
      imports: [namespace + 'api.client.AvogadroClientApi', 'net.minecraftforge.fluids.FluidStack'],
      lines: ['AvogadroClientApi.withFluidTooltip(contents, drawTooltip)'],
      zen: [
        ...client,
        'import crafttweaker.liquid.ILiquidStack;',
        'import mods.avogadro.ClientAction;',
        '',
        'function fluidTooltip(contents as ILiquidStack, drawTooltip as ClientAction) {',
        '    Client.withFluidTooltip(contents, drawTooltip);',
        '}',
      ],
    },
    'client-thread': {
      title: 'Schedule export work on the client thread',
      method: 'exportFromWorker',
      type: 'void',
      args: [['exportWork', 'Runnable']],
      imports: ['net.minecraft.client.Minecraft'],
      lines: ['Minecraft.getMinecraft().addScheduledTask(exportWork)'],
      zen: [
        ...client,
        'import mods.avogadro.ClientAction;',
        '',
        'function exportFromWorker(exportWork as ClientAction) {',
        '    Client.onClientThread(exportWork);',
        '}',
      ],
    },
    listeners: {
      title: 'Handle export completion and report the result',
      method: 'watch',
      type: 'void',
      args: [
        ['job', 'MediaExportJob'],
        ['showStatus', 'Consumer<String>'],
      ],
      imports: [namespace + 'api.client.MediaExportJob', 'java.util.function.Consumer'],
      lines: [
        'job.onComplete(result -> showStatus.accept(result.output() != null ? "Saved " + result.output() : result.failure() == null ? "Export cancelled" : "Export failed: " + result.failure()))',
      ],
      kotlin: [
        'job.onComplete { result -> showStatus.accept(result.output()?.let { "Saved " + it } ?: result.failure()?.let { "Export failed: " + it } ?: "Export cancelled") }',
      ],
      scala: [
        'job.onComplete(result => showStatus.accept(Option(result.output()).map("Saved " + _).orElse(Option(result.failure()).map("Export failed: " + _)).getOrElse("Export cancelled")))',
      ],
      groovy: [
        'import io.github.wurtzitane.avogadro.api.client.MediaExportJob',
        'import java.util.function.Consumer',
        '',
        'static void watch(MediaExportJob job, Consumer<String> showStatus) {',
        '    job.onComplete { result -> showStatus.accept(result.output() != null ? "Saved " + result.output() : result.failure() == null ? "Export cancelled" : "Export failed: " + result.failure()) }',
        '}',
      ],
      zen: [
        ...client,
        'import mods.avogadro.ExportJob;',
        '',
        'function watch(job as ExportJob) {',
        '    job.onComplete(function(done) {',
        '        if (done.state == "SUCCEEDED") print("Saved " + done.output);',
        '        else if (done.state == "CANCELLED") print("Export cancelled");',
        '        else print("Export failed: " + done.failure);',
        '    });',
        '}',
      ],
    },
    item: {
      title: 'Create a generated molecule sample stack',
      method: 'sample',
      type: 'ItemStack',
      args: [['water', 'MoleculeDef']],
      imports: [
        namespace + 'api.AvogadroApi',
        namespace + 'molecule.MoleculeDef',
        'net.minecraft.item.ItemStack',
      ],
      lines: ['return AvogadroApi.moleculeItem(water)'],
      zen: [...molecules, '', 'val water = Molecules.sampleItem("guide:water");'],
    },
    progress: {
      title: 'Read export progress',
      method: 'progress',
      type: 'String',
      args: [['job', 'MediaExportJob']],
      imports: [namespace + 'api.client.MediaExportJob'],
      lines: [
        'VAR progress = job.progress()',
        'return progress.state().toString() + ": " + progress.encodedFrames() + "/" + progress.totalFrames()',
      ],
      zen: [
        ...client,
        'import mods.avogadro.ExportJob;',
        '',
        'function progress(job as ExportJob) as string {',
        '    return job.state + ": " + job.encodedFrames + "/" + job.totalFrames;',
        '}',
      ],
    },
    cancel: {
      title: 'Cancel an export',
      method: 'cancel',
      type: 'boolean',
      args: [['job', 'MediaExportJob']],
      imports: [namespace + 'api.client.MediaExportJob'],
      lines: ['return job.cancel()'],
      zen: [
        ...client,
        'import mods.avogadro.ExportJob;',
        '',
        'function cancel(job as ExportJob) as bool {',
        '    return job.cancel();',
        '}',
      ],
    },
    lookup: {
      title: 'Look up an item on the server',
      method: 'lookup',
      type: 'MoleculeDef',
      nullable: true,
      args: [['stack', 'ItemStack']],
      imports: [
        namespace + 'api.AvogadroApi',
        namespace + 'molecule.MoleculeDef',
        'net.minecraft.item.ItemStack',
      ],
      lines: ['return AvogadroApi.serverView().find(stack)'],
      zen: [
        ...molecules,
        'import crafttweaker.item.IItemStack;',
        'import mods.avogadro.MoleculeView;',
        '',
        'function lookup(stack as IItemStack) as MoleculeView {',
        '    return Molecules.server().findItem(stack);',
        '}',
      ],
    },
    'fluid-lookup': {
      title: 'Look up the exact fluid stack',
      method: 'lookupFluid',
      type: 'MoleculeDef',
      nullable: true,
      args: [['contents', 'FluidStack']],
      imports: [
        namespace + 'api.AvogadroApi',
        namespace + 'molecule.MoleculeDef',
        'net.minecraftforge.fluids.FluidStack',
      ],
      lines: ['return AvogadroApi.serverView().find(contents)'],
      zen: [
        ...molecules,
        'import crafttweaker.liquid.ILiquidStack;',
        'import mods.avogadro.MoleculeView;',
        '',
        'function lookupFluid(contents as ILiquidStack) as MoleculeView {',
        '    return Molecules.server().findFluid(contents);',
        '}',
      ],
    },
    mass: {
      title: 'Calculate molar mass',
      method: 'molarMass',
      type: 'double',
      args: [],
      imports: [namespace + 'api.AvogadroApi'],
      lines: ['return AvogadroApi.weight("C9H8O4").molarMass()'],
      groovy: ['def gramsPerMole = mods.avogadro.molecules.weight("C9H8O4").molarMass()'],
      zen: [...molecules, '', 'val gramsPerMole = Molecules.molarMass("C9H8O4");'],
    },
    remap: {
      title: 'Remove both hydrogens and keep the index map',
      method: 'isolateOxygen',
      type: 'StructureEditResult',
      args: [['water', 'StructureFragment']],
      imports: [namespace + 'api.StructureFragment', namespace + 'api.StructureEditResult'],
      lines: ['return water.edit().removeAtoms(1, 2).build()'],
      zen: [
        'import mods.avogadro.Geometry;',
        'import mods.avogadro.EditedGeometry;',
        '',
        'function isolateOxygen(water as Geometry) as EditedGeometry {',
        '    return water.edit().removeAtoms([1, 2]).build();',
        '}',
      ],
    },
    ammonia: {
      title: 'Edit the water geometry into an ammonia model',
      method: 'ammonia',
      type: 'StructureEditResult',
      args: [['water', 'StructureFragment']],
      imports: [
        namespace + 'api.StructureFragment',
        namespace + 'api.StructureEditResult',
        namespace + 'molecule.BondType',
      ],
      lines: [
        'VAR editor = water.edit().replaceAtom(0, "N").moveAtom(0, 0.0, 0.0, 0.25)',
        'VAR hydrogen = editor.addAtom("H", 0.0, -0.85, -0.35)',
        'return editor.setBond(0, hydrogen, BondType.SINGLE).build()',
      ],
      zen: [
        'import mods.avogadro.Geometry;',
        'import mods.avogadro.EditedGeometry;',
        '',
        'function ammonia(water as Geometry) as EditedGeometry {',
        '    val editor = water.edit().replaceAtom(0, "N").moveAtom(0, 0.0, 0.0, 0.25);',
        '    editor.atom("H", 0.0, -0.85, -0.35);',
        '    return editor.setBond(0, 3, "SINGLE").build();',
        '}',
      ],
    },
    transform: {
      title: 'Rotate and place a second water molecule',
      method: 'waterPair',
      type: 'StructureFragment',
      args: [['water', 'StructureFragment']],
      imports: [namespace + 'api.StructureFragment'],
      lines: [
        'VAR second = water.rotate(0.0, 0.0, 1.0, 180.0).translate(3.2, 0.0, 0.0)',
        'return water.qualified("first").append("second", second)',
      ],
      zen: [
        'import mods.avogadro.Geometry;',
        '',
        'function waterPair(water as Geometry) as Geometry {',
        '    val second = water.rotate(0.0, 0.0, 1.0, 180.0).translate(3.2, 0.0, 0.0);',
        '    return water.qualified("first").append(second.qualified("second"));',
        '}',
      ],
    },
    'open-network': {
      title: 'Open a polymer network',
      method: 'openNetwork',
      type: 'void',
      args: [['network', 'MoleculeDef']],
      imports: [namespace + 'client.PolymerNetworkExaminer', namespace + 'molecule.MoleculeDef'],
      lines: ['PolymerNetworkExaminer.open(network)'],
      zen: [
        ...client,
        '',
        'function openNetwork(id as string) {',
        '    Client.openNetwork(id);',
        '}',
      ],
    },
  };
  for (const original of guide.querySelectorAll('.av-example[data-example], pre[data-operation]')) {
    const key = original.dataset.operation || original.dataset.example;
    const fragment = original.dataset.fragmentExample;
    if (!fragment && !Object.hasOwn(operations, key)) continue;
    const operation = fragment ? null : operations[key];
    const recipe = document.createElement('div');
    recipe.className = 'av-example-group';
    recipe.dataset.example = 'operation-' + key;
    recipe.dataset.defaultLanguage = 'java';
    const heading = document.createElement('h3');
    heading.textContent = operation?.title || 'Build the reusable fragment';
    recipe.append(heading);
    for (const language of ['java', 'kotlin', 'scala', 'groovy', 'zenscript']) {
      const pre = document.createElement('pre');
      pre.dataset.language = language;
      const code = document.createElement('code');
      code.className = 'language-' + language;
      code.textContent = fragment
        ? nativeRegistration(null, JSON.parse(fragment), language, key)
        : operationSource(operation, language);
      pre.append(code);
      recipe.append(pre);
    }
    if (key === 'tags') {
      const tagFile = original.querySelector('[data-language="json"] pre');
      if (tagFile) {
        const pre = tagFile.cloneNode(true);
        pre.dataset.language = 'json';
        recipe.append(pre);
      }
    }
    original.after(recipe);
    original.hidden = true;
  }
}

function operationSource(operation, language) {
  if (language === 'zenscript') return operation.zen.join('\n');
  if (operation.native?.[language]) return operation.native[language].join('\n');
  const java = language === 'java';
  const kotlin = language === 'kotlin';
  const scala = language === 'scala';
  const groovy = language === 'groovy';
  if (groovy && operation.groovy) return operation.groovy.join('\n');
  const type = (name) => {
    if (java || groovy) return name;
    if (scala && name.includes('<')) return name.replace('<', '[').replace('>', ']');
    if (kotlin && name === 'List<MoleculeBuilder>') return 'MutableList<MoleculeBuilder>';
    return (
      { boolean: 'Boolean', double: 'Double', int: 'Int', long: 'Long', void: 'Unit' }[name] || name
    );
  };
  const args = operation.args
    .map(([name, value]) =>
      kotlin || scala ? name + ': ' + type(value) : type(value) + ' ' + name,
    )
    .join(', ');
  const result = type(operation.type) + (kotlin && operation.nullable ? '?' : '');
  const body = (kotlin && operation.kotlin) || (scala && operation.scala) || operation.lines;
  const lines = body.map((line) => {
    line = line
      .replace('NEW ', kotlin ? '' : 'new ')
      .replace('LAMBDA ', '')
      .replace(' END', '');
    line = line.replace(/^VAR /, java ? 'var ' : groovy ? 'def ' : 'val ');
    if (kotlin) line = line.replace('molecules.size()', 'molecules.size');
    const atomOptions = (kotlin ? '' : 'new ') + 'AtomExportOptions(water, 0, true)';
    return line.replace('ATOM_OPTIONS', atomOptions) + (java ? ';' : '');
  });
  const imports = operation.imports
    .filter((name) => !kotlin || name !== 'java.util.List')
    .map(
      (name) =>
        'import ' + (scala ? name.replace('.export.', '.`export`.') : name) + (java ? ';' : ''),
    );
  const indent = (size) => lines.map((line) => ' '.repeat(size) + line);
  if (kotlin)
    return [
      ...imports,
      '',
      'fun ' + operation.method + '(' + args + '): ' + result + ' {',
      ...indent(4),
      '}',
    ].join('\n');
  if (scala)
    return [
      ...imports,
      '',
      'object ExampleOperation {',
      '  def ' + operation.method + '(' + args + '): ' + result + ' = {',
      ...indent(4),
      '  }',
      '}',
    ].join('\n');
  const signature =
    result +
    ' ' +
    operation.method +
    '(' +
    args +
    ')' +
    (java && operation.throws ? ' throws ' + operation.throws : '') +
    ' {';
  if (groovy) return [...imports, '', 'static ' + signature, ...indent(4), '}'].join('\n');
  return [
    ...imports,
    '',
    'public class ExampleOperation {',
    '    public static ' + signature,
    ...indent(8),
    '    }',
    '}',
  ].join('\n');
}
