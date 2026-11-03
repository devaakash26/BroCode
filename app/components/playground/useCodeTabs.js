'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import toast from 'react-hot-toast';
import { LANGUAGES, MAIN_TAB, MAX_TABS, TEMPLATES, codeKey, inputsKey } from './utils';

const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/**
 * Question tabs. The list, titles, per-tab language and the host's
 * "bring everyone here" signal all live in the shared Yjs doc; which tab
 * you are looking at is your own.
 *
 *   tabs    Y.Map  id → { title, createdAt, by }   ("main" only once renamed)
 *   tabLang Y.Map  id → language                     (main uses meta.language)
 *   meta    focus → { tab, by, byId, at }
 */
export default function useCodeTabs(doc, { mainLanguage, setMainLanguage, me }) {
  const tabsMap = useMemo(() => doc.getMap('tabs'), [doc]);
  const langMap = useMemo(() => doc.getMap('tabLang'), [doc]);
  const meta = useMemo(() => doc.getMap('meta'), [doc]);

  const read = useCallback(() => {
    const extra = [];
    tabsMap.forEach((v, id) => {
      if (id !== MAIN_TAB) extra.push({ id, ...v });
    });
    extra.sort((a, b) => a.createdAt - b.createdAt);
    return [{ id: MAIN_TAB, title: tabsMap.get(MAIN_TAB)?.title || 'Question 1', createdAt: 0 }, ...extra];
  }, [tabsMap]);

  const [tabs, setTabs] = useState(read);
  const [langs, setLangs] = useState(() => langMap.toJSON());
  const [active, setActive] = useState(() => {
    const f = meta.get('focus');
    return f?.tab && (f.tab === MAIN_TAB || tabsMap.has(f.tab)) ? f.tab : MAIN_TAB;
  });

  useEffect(() => {
    const sync = () => setTabs(read());
    tabsMap.observe(sync);
    sync();
    return () => tabsMap.unobserve(sync);
  }, [tabsMap, read]);

  useEffect(() => {
    const sync = () => setLangs(langMap.toJSON());
    langMap.observe(sync);
    sync();
    return () => langMap.unobserve(sync);
  }, [langMap]);

  // Host pulled everyone onto a tab.
  useEffect(() => {
    const onMeta = (e, tx) => {
      if (tx.local || !e.keysChanged.has('focus')) return;
      const f = meta.get('focus');
      if (!f?.tab || f.byId === me.id) return;
      setActive(f.tab);
      toast(`${f.by || 'The host'} brought everyone to “${tabsMap.get(f.tab)?.title || 'Question 1'}”`);
    };
    meta.observe(onMeta);
    return () => meta.unobserve(onMeta);
  }, [meta, tabsMap, me.id]);

  // The tab you were on was closed by someone else.
  useEffect(() => {
    if (!tabs.some((t) => t.id === active)) setActive(MAIN_TAB);
  }, [tabs, active]);

  const language = active === MAIN_TAB ? mainLanguage : langs[active] || 'cpp';

  const setLanguage = useCallback(
    (lang) => {
      if (!LANGUAGES.some((l) => l.id === lang)) return;
      if (active === MAIN_TAB) setMainLanguage(lang);
      else langMap.set(active, lang);
    },
    [active, setMainLanguage, langMap],
  );

  /**
   * Opens a new tab. Options (all optional) pre-fill it, e.g. from a problem:
   * { title, code: { [lang]: string }, inputs: [string], language, focus }
   */
  const addTab = useCallback(
    (opts = {}) => {
      if (tabs.length >= MAX_TABS) {
        toast.error(`Up to ${MAX_TABS} tabs per room — close one first`);
        return null;
      }
      const id = newId();
      const lang = LANGUAGES.some((l) => l.id === opts.language) ? opts.language : language;
      const stdins = (opts.inputs?.length ? opts.inputs : ['']).slice(0, 5);
      // One transaction, so nobody ever sees the tab without its code.
      doc.transact(() => {
        for (const { id: l } of LANGUAGES) {
          const src = typeof opts.code?.[l] === 'string' && opts.code[l].trim() ? opts.code[l] : TEMPLATES[l];
          doc.getText(`code:${codeKey(id, l)}`).insert(0, src);
        }
        doc.getArray(inputsKey(id)).push(stdins.map((v) => {
          const t = new Y.Text();
          if (v) t.insert(0, v);
          return t;
        }));
        langMap.set(id, lang);
        tabsMap.set(id, {
          title: (opts.title || `Question ${tabs.length + 1}`).slice(0, 40),
          createdAt: Date.now(),
          by: me.id,
          ...(opts.problemId ? { problemId: opts.problemId } : {}),
        });
        if (opts.focus) meta.set('focus', { tab: id, by: me.name, byId: me.id, at: Date.now() });
      });
      setActive(id);
      return id;
    },
    [doc, tabs.length, langMap, tabsMap, meta, language, me.id, me.name],
  );

  const renameTab = useCallback(
    (id, title) => {
      const clean = title.trim().slice(0, 40);
      if (!clean) return;
      const cur = tabsMap.get(id) || { createdAt: 0 };
      tabsMap.set(id, { ...cur, title: clean });
    },
    [tabsMap],
  );

  const removeTab = useCallback(
    (id) => {
      if (id === MAIN_TAB) return;
      doc.transact(() => {
        for (const { id: lang } of LANGUAGES) {
          const t = doc.getText(`code:${codeKey(id, lang)}`);
          if (t.length) t.delete(0, t.length);
        }
        const inputs = doc.getArray(inputsKey(id));
        if (inputs.length) inputs.delete(0, inputs.length);
        langMap.delete(id);
        tabsMap.delete(id);
      });
      if (active === id) setActive(MAIN_TAB);
    },
    [doc, langMap, tabsMap, active],
  );

  const bringEveryone = useCallback(() => {
    meta.set('focus', { tab: active, by: me.name, byId: me.id, at: Date.now() });
    toast.success('Everyone is on this tab now');
  }, [meta, active, me.name, me.id]);

  return { tabs, active, setActive, language, setLanguage, addTab, renameTab, removeTab, bringEveryone };
}
