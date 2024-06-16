const KEYWORD = "DocBaseTreeViewParentMarker:";
const TREE_CACHE_KEY = "docbase-treeview-tree-cache";

function strip(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}
async function getAllMarkedPages(page = 1) {
  const perPage = 1000;
  const encoded = encodeURIComponent(`"${KEYWORD}"`);
  const res = await (
    await fetch(
      `/search?page=${page}&per_page=${perPage}&q=desc%3Ascore%20${encoded}`,
      {
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    )
  ).json();
  const entries = [];
  for (const page of res[1]) {
    const match = strip(page.highlights.other).match(
      new RegExp(`${KEYWORD}\\s+(Root|#\{(\\d+)\})`)
    );
    if (!match) continue;
    entries.push({
      id: page.id,
      title: page.title,
      parentId: match[2] ? parseInt(match[2]) : 0,
      children: [],
    });
  }
  if (res[0].total_entries > page * perPage) {
    entries.push(...(await getAllMarkedPages(page + 1)));
  }
  return entries;
}
function convertToTree(entries, parentId = 0) {
  return entries
    .filter((entry) => entry.parentId === parentId)
    .map((entry) => ({
      ...entry,
      children: convertToTree(entries, entry.id).sort((a, b)=>a.title.localeCompare(b.title)),
    }));
}

async function createChild(parentPageId) {
  const token = document.cookie.match(/CSRF-TOKEN=(.+)(?:;|$)/)[1];
  const res = await fetch("/posts", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-Csrf-Token": token,
    },
    body: JSON.stringify({
      post: {
        title: `${parentPageId}の子ページ`,
        body: `${KEYWORD}\n#{${parentPageId}}`,
        tag_list: "",
        limited_access: null,
        groups: [],
        draft: true,
        disable_notification: false,
      },
    }),
    redirect: "manual",
  });
  return (await res.headers.get("Location")) + "/edit";
}

async function renderChildren(parentNode, children) {
  const ul = document.createElement("ul");
  parentNode.appendChild(ul);
  for (const child of children) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    const a = document.createElement("a");
    a.textContent = child.title;
    a.href = `/posts/${child.id}`;
    a.setAttribute("data-page-id", child.id);
    span.appendChild(a);
    li.appendChild(span);
    ul.appendChild(li);
    if (child.children.length > 0) {
      span.classList.add("docbase-treeview-folder");
      renderChildren(li, child.children);
    } else {
      span.classList.add("docbase-treeview-file");
    }
  }
}
async function openParent(elm) {
  const ul = elm.closest("ul");
  if (ul && ul.previousSibling) {
    ul.previousSibling.classList.add("open");
    openParent(ul.previousSibling);
  }
}
async function openChild(elm) {
  const folder = elm.parentNode;
  if (folder.classList.contains("docbase-treeview-folder")) {
    folder.classList.add("open");
  }
}
function getPageId() {
  const match = location.href.match(/posts\/(?:(\d+)|new\?origin=(\d+))/);
  console.log(match)
  if (!match) return;
  return match[1] ?? match[2];
}
async function renderTreeView() {
  const id = "docbase-treeview-tree";
  document.getElementById(id)?.remove();
  const wrapDiv = document.createElement("div");
  wrapDiv.id = id;
  const nav = document.querySelector(".emUosV").parentNode;
  nav.appendChild(wrapDiv);

  const pageId = getPageId();
  if (pageId) {
    const newPageButton = document.createElement("button");
    newPageButton.textContent = "子ページを作成";
    newPageButton.id = "docbase-treeview-create-child"
    wrapDiv.appendChild(newPageButton);
    newPageButton.addEventListener("click", async () => {
      newPageButton.disabled = true;
      const url = await createChild(pageId);
      setTimeout(()=>{
        location.href = url;
      }, 500);
    });
  }

  const tree = JSON.parse(localStorage.getItem(TREE_CACHE_KEY) ?? []);
  renderChildren(wrapDiv, tree);

  const folders = document.querySelectorAll(".docbase-treeview-folder");
  for (const folder of folders) {
    folder.addEventListener("click", function () {
      this.classList.toggle("open");
    });
  }

  const links = document.querySelectorAll(".docbase-treeview-folder > a");
  for (const link of links) {
    link.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  if (!pageId) return;
  const current = document.querySelector(`[data-page-id="${pageId}"]`);
  if (!current) return;
  current.classList.add("active");
  openParent(current);
  openChild(current);
}
async function buildCache() {
  const pages = await getAllMarkedPages();
  localStorage.setItem(TREE_CACHE_KEY, JSON.stringify(convertToTree(pages)));
}
async function main() {
  await buildCache();
  renderTreeView();
}
main();

window.addEventListener("popstate", (event) => {
  main();
});

const newScript = document.createElement("script");
newScript.type = "text/javascript";
newScript.src = chrome.runtime.getURL("inline.js");
document.querySelector("head").appendChild(newScript);

window.addEventListener("state-changed", function (e) {
  main();
});
