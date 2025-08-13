
/*
AUTHOR:           DONALD ATTU

CODE DESCRIPTION: ProTasker is a full-featured productivity
                  and project management web app built with 
                  React.js and Tailwind CSS. It combines a 
                  Kanban task board, note-taking workspace, 
                  and file storage into a single intuitive 
                  interface. Users can create, edit, and 
                  organize tasks visually, jot down notes 
                  for quick ideas or meeting summaries, and 
                  upload project files — all while having 
                  data persist locally for quick access. 
                  The app’s responsive design makes it 
                  easy to use on desktops, tablets, and 
                  smartphones, making it ideal for freelancers, 
                  students, and teams who want an all-in-one 
                  tool to stay organized and productive.
 */

<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <img src="/favicon.png" alt="logo" className="w-6 h-6" />
    <h2 className="text-xl font-bold">TaskFlow</h2>
  </div>
  <div className="text-sm text-gray-500">Demo</div>
</div>

import React, { useEffect, useState, useRef } from "react";

// ---------- tiny markdown renderer (supports headings, bold, italics, links, lists, code) ----------
function renderMarkdown(md) {
  if (!md) return "";
  // escape HTML
  const escapeHtml = (s) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  let text = escapeHtml(md);
  // code blocks
  text = text.replace(/```([\s\S]*?)```/g, (_, code) => `
<pre class=\"rounded p-2 bg-gray-900 text-white text-sm overflow-auto\"><code>${code}</code></pre>
`);
  // inline code
  text = text.replace(/`([^`]+)`/g, "<code class=\"rounded bg-gray-200 px-1\">$1</code>");
  // headings
  text = text.replace(/^### (.*$)/gim, "<h3 class=\"text-lg font-semibold\">$1</h3>");
  text = text.replace(/^## (.*$)/gim, "<h2 class=\"text-xl font-bold\">$1</h2>");
  text = text.replace(/^# (.*$)/gim, "<h1 class=\"text-2xl font-extrabold\">$1</h1>");
  // bold and italic
  text = text.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  text = text.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  // links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, "<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\" class=\"underline\">$1</a>");
  // unordered lists
  text = text.replace(/(^|\n)\s*-\s+(.*)/gim, "$1<ul><li>$2</li></ul>");
  // paragraphs
  text = text.replace(/\n\n+/g, "</p><p>");
  return `<div class=\"prose max-w-none\"><p>${text}</p></div>`;
}

// ---- Utilities ----
const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

// LocalStorage persistence helper (mock backend)
const STORAGE_KEY = "jobready_portfolio_data_v1";
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return null;
  }
}
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

// ----- Sample seed data -----
const sampleSeed = () => ({
  meta: { createdAt: Date.now(), name: "TaskFlow — Demo Project" },
  users: [
    { id: "u_me", name: "You", role: "owner", avatarColor: "#4f46e5" },
  ],
  projects: [
    {
      id: "proj_1",
      title: "Website Redesign",
      description: "A modern responsive redesign for marketing site. Use components, accessibility, and performance improvements.",
      image: null,
      tags: ["frontend", "react", "design"],
      board: {
        columns: [
          { id: "todo", title: "To Do", cardIds: ["c1", "c2"] },
          { id: "inprogress", title: "In Progress", cardIds: ["c3"] },
          { id: "done", title: "Done", cardIds: [] },
        ],
        cards: {
          c1: { id: "c1", title: "Landing hero", body: "Create a performant hero with LCP under 1.2s", assignee: "u_me", priority: 2 },
          c2: { id: "c2", title: "Nav accessibility", body: "Ensure keyboard nav and ARIA roles.", assignee: null, priority: 1 },
          c3: { id: "c3", title: "Mobile css fixes", body: "Fix flexflow on small screens.", assignee: "u_me", priority: 3 },
        },
      },
    },
  ],
});

// ---------- App ----------
export default function App() {
  const [data, setData] = useState(() => loadData() || sampleSeed());
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0]?.id || null);
  const [showEditor, setShowEditor] = useState(false);
  const [query, setQuery] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const fileInputRef = useRef();

  useEffect(() => {
    saveData(data);
  }, [data]);

  // ---------- Project operations ----------
  function createProject() {
    const newProj = {
      id: uid("proj"),
      title: "New Project",
      description: "Describe this project. Use markdown!",
      image: null,
      tags: [],
      board: { columns: [
        { id: "todo", title: "To Do", cardIds: [] },
        { id: "inprogress", title: "In Progress", cardIds: [] },
        { id: "done", title: "Done", cardIds: [] },
      ], cards: {} },
    };
    setData((d) => ({ ...d, projects: [newProj, ...d.projects] }));
    setSelectedProjectId(newProj.id);
    setShowEditor(true);
  }

  function updateProject(projectId, patch) {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)),
    }));
  }

  function deleteProject(projectId) {
    if (!confirm("Delete project? This cannot be undone.")) return;
    setData((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== projectId) }));
    if (selectedProjectId === projectId) setSelectedProjectId(null);
  }

  // ---------- Board operations ----------
  function addCard(projectId, columnId, card) {
    setData((d) => {
      const projects = d.projects.map((p) => {
        if (p.id !== projectId) return p;
        const cardId = uid("c");
        return {
          ...p,
          board: {
            ...p.board,
            columns: p.board.columns.map((col) => col.id === columnId ? { ...col, cardIds: [cardId, ...col.cardIds] } : col),
            cards: { ...p.board.cards, [cardId]: { id: cardId, ...card } },
          },
        };
      });
      return { ...d, projects };
    });
  }

  function moveCard(projectId, fromColId, toColId, cardId, toIndex = 0) {
    setData((d) => {
      const projects = d.projects.map((p) => {
        if (p.id !== projectId) return p;
        const newCols = p.board.columns.map((col) => {
          if (col.id === fromColId) return { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) };
          if (col.id === toColId) {
            const newArr = [...col.cardIds];
            newArr.splice(toIndex, 0, cardId);
            return { ...col, cardIds: newArr };
          }
          return col;
        });
        return { ...p, board: { ...p.board, columns: newCols } };
      });
      return { ...d, projects };
    });
  }

  function updateCard(projectId, cardId, patch) {
    setData((d) => {
      const projects = d.projects.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, board: { ...p.board, cards: { ...p.board.cards, [cardId]: { ...p.board.cards[cardId], ...patch } } } };
      });
      return { ...d, projects };
    });
  }

  // ---------- Drag handlers ----------
  function onDragStart(e, cardId, fromColId) {
    e.dataTransfer.setData("text/plain", JSON.stringify({ cardId, fromColId }));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropCard(e, toColId) {
    e.preventDefault();
    const payload = JSON.parse(e.dataTransfer.getData("text/plain"));
    const proj = data.projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;
    const fromColId = payload.fromColId;
    const cardId = payload.cardId;
    if (fromColId === toColId) return; // no-op
    moveCard(selectedProjectId, fromColId, toColId, cardId);
  }

  function allowDrop(e) {
    e.preventDefault();
  }

  // ---------- Image upload (project image) ----------
  function handleImageUpload(projectId, file) {
    const reader = new FileReader();
    reader.onload = () => {
      updateProject(projectId, { image: reader.result });
    };
    reader.readAsDataURL(file);
  }

  // ---------- Export / Import ----------
  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-data-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (obj && obj.projects) setData(obj);
        else alert("Invalid file");
      } catch (e) {
        alert("Could not parse JSON");
      }
    };
    reader.readAsText(file);
  }

  // ---------- UI small helpers ----------
  const projectList = data.projects.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()) || p.tags.join(",").includes(query.toLowerCase()));
  const selectedProject = data.projects.find((p) => p.id === selectedProjectId) || projectList[0] || null;

  useEffect(() => {
    if (!selectedProjectId && selectedProject) setSelectedProjectId(selectedProject.id);
  }, [selectedProjectId, selectedProject]);

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="md:col-span-1 bg-white rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">TaskFlow</h2>
            <div className="text-sm text-gray-500">Demo</div>
          </div>

          <div className="mb-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects or tags..." className="w-full px-3 py-2 rounded border" />
          </div>

          <div className="space-y-3 mb-4">
            <button onClick={createProject} className="w-full rounded-lg py-2 bg-indigo-600 text-white font-semibold shadow">+ New Project</button>
            <button onClick={() => { saveData(data); alert("Saved"); }} className="w-full rounded-lg py-2 border">Save</button>
            <div className="flex gap-2">
              <button onClick={exportJSON} className="flex-1 rounded-lg py-2 border">Export</button>
              <label className="flex-1 rounded-lg py-2 text-center border cursor-pointer">
                Import
                <input type="file" accept="application/json" onChange={(e) => importJSON(e.target.files[0])} className="hidden" />
              </label>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-2">Projects</div>
          <div className="space-y-2 max-h-[40vh] overflow-auto">
            {projectList.map((p) => (
              <div key={p.id} onClick={() => { setSelectedProjectId(p.id); setShowEditor(false); }} className={`p-3 rounded-lg cursor-pointer ${selectedProjectId === p.id ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-gray-500 truncate">{p.description}</div>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {p.tags.slice(0, 3).map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded bg-gray-100">{t}</span>)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{Object.keys(p.board.cards).length} cards</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500">Tip: Click a project to open. Drag cards between columns to showcase DnD skills.</div>
        </aside>

        {/* Main */}
        <main className="md:col-span-3 bg-white rounded-2xl p-4 shadow">
          {!selectedProject && <div className="p-6 text-center text-gray-500">No project selected — create one to begin.</div>}

          {selectedProject && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">{selectedProject.title}</h1>
                    <div className="text-sm text-gray-500">{selectedProject.tags.join(', ')}</div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{selectedProject.description}</div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                    Upload Image
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(selectedProject.id, e.target.files[0])} className="hidden" />
                  </label>
                  <button onClick={() => { setShowEditor((s) => !s); }} className="px-3 py-2 border rounded">{showEditor ? 'Close Editor' : 'Edit'}</button>
                  <button onClick={() => deleteProject(selectedProject.id)} className="px-3 py-2 bg-red-50 text-red-600 border rounded">Delete</button>
                </div>
              </div>

              {selectedProject.image && <img src={selectedProject.image} alt="project" className="w-full h-48 object-cover rounded-lg" />}

              {showEditor && (
                <ProjectEditor project={selectedProject} updateProject={(patch) => updateProject(selectedProject.id, patch)} />
              )}

              <Board
                project={selectedProject}
                addCard={(colId, card) => addCard(selectedProject.id, colId, card)}
                onDragStart={onDragStart}
                onDropCard={(e, toColId) => { e.preventDefault(); onDropCard(e, toColId); }}
                allowDrop={allowDrop}
                updateCard={(cardId, patch) => updateCard(selectedProject.id, cardId, patch)}
              />

            </div>
          )}
        </main>
      </div>

      <footer className="max-w-7xl mx-auto mt-6 text-sm text-gray-500">Built with React • By Doonald Attu</footer>
    </div>
  );
}

// ---------- Board Component ----------
function Board({ project, addCard, onDragStart, onDropCard, allowDrop, updateCard }) {
  if (!project) return null;
  const { board } = project;
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardBody, setNewCardBody] = useState("");

  function handleAdd(colId) {
    if (!newCardTitle.trim()) return alert("Give the card a title.");
    addCard(colId, { title: newCardTitle.trim(), body: newCardBody, assignee: null, priority: 2 });
    setNewCardTitle("");
    setNewCardBody("");
  }

  return (
    <div>
      <div className="flex gap-4 overflow-auto pb-4">
        {board.columns.map((col) => (
          <div key={col.id} className="min-w-[260px] bg-slate-50 rounded p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{col.title}</div>
              <div className="text-xs text-gray-500">{col.cardIds.length}</div>
            </div>
            <div onDragOver={allowDrop} onDrop={(e) => onDropCard(e, col.id)} className="space-y-2 min-h-[100px]">
              {col.cardIds.map((cardId) => {
                const card = board.cards[cardId];
                return (
                  <div key={cardId} draggable onDragStart={(e) => onDragStart(e, cardId, col.id)} className="bg-white p-3 rounded shadow-sm cursor-grab">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium">{card.title}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-3">{card.body}</div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => { const newTitle = prompt('Edit title', card.title); if (newTitle !== null) updateCard(cardId, { title: newTitle }); }} className="text-xs px-2 py-1 rounded border">Edit</button>
                          <button onClick={() => { const newBody = prompt('Edit body', card.body); if (newBody !== null) updateCard(cardId, { body: newBody }); }} className="text-xs px-2 py-1 rounded border">Edit Body</button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">P{card.priority}</div>
                    </div>
                  </div>
                );
              })}

              <div className="mt-2">
                <input placeholder="Title" value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} className="w-full px-2 py-1 rounded border text-sm mb-1" />
                <textarea placeholder="Details (markdown ok)" value={newCardBody} onChange={(e) => setNewCardBody(e.target.value)} className="w-full px-2 py-1 rounded border text-sm mb-1" rows={2}></textarea>
                <div className="flex gap-2">
                  <button onClick={() => handleAdd(col.id)} className="text-sm px-3 py-1 rounded bg-indigo-600 text-white">Add</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Project Editor Component ----------
function ProjectEditor({ project, updateProject }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [tags, setTags] = useState(project.tags.join(", "));

  function save() {
    updateProject({ title: title.trim() || 'Untitled', description, tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
    alert('Saved');
  }

  return (
    <div className="bg-gray-50 p-3 rounded">
      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded border mb-2" />
          <label className="block text-sm font-medium">Description (Markdown supported)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 rounded border mb-2" />
          <div className="text-xs text-gray-500 mb-2">Preview</div>
          <div className="border rounded p-3 bg-white" dangerouslySetInnerHTML={{ __html: renderMarkdown(description) }} />
        </div>
        <div>
          <label className="block text-sm font-medium">Tags (comma separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-3 py-2 rounded border mb-2" />

          <div className="mt-3">
            <button onClick={save} className="w-full py-2 rounded bg-green-600 text-white">Save Project</button>
          </div>
        </div>
      </div>
    </div>
  );
}
