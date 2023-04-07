import Editor from "./Editor.js";
import Subdirectory from "./Subdirectory.js";
import DocEditFooter from "./DocEditFooter.js";
import { makeElement } from "../../util/templates.js";
import { getDocument, editDocument } from "../API/api.js";
import { local } from "../../util/storage.js";
import { debounce } from "../../util/helper.js";
import { push, ROOT } from "../router.js";
import { setListScrollPos } from "../../util/scrollPos.js";
import { validateState } from "../../util/validate.js";

export default function DocEditPage({
  $target,
  initialState = (this.defaultState = {
    documentId: "",
  }),
}) {
  const $page = makeElement("main", "doc-edit-page");
  $target.appendChild($page);

  this.state = initialState;

  let docTempSaveKey = `tempSave-${this.state}`;

  const editor = new Editor({
    $target: $page,
    onEdit: (document) => {
      const tempDoc = setTempSave(document);
      setAutoSave(tempDoc);
    },
  });

  const subdirectory = new Subdirectory({
    $target: $page
  })

  new DocEditFooter({
    $target: $page,
  });

  const setTempSave = (document) => {
    docTempSaveKey = `tempSave-${this.state}`;

    local.setItem(docTempSaveKey, {
      ...document,
      tempSaveAt: new Date(),
    });

    const docTempSave = local.getItem(docTempSaveKey, {
      title: "",
      content: "",
    });

    return docTempSave;
  };

  const setAutoSave = debounce(async (tempDoc) => {
    await editDocument({
      documentId: this.state,
      document: {
        title: tempDoc.title,
        content: tempDoc.content,
      },
    });
    setListScrollPos({ calculate: "current" });
    push(this.state);
    local.removeItem(docTempSaveKey);
  }, 1000);

  this.setState = async (nextState) => {
    try {
      validateState(nextState, this.defaultState);
      this.state = nextState;
      docTempSaveKey = `tempSave-${this.state}`;
  
      if (nextState === ROOT) {
        editor.init();
      } else {
        const currentDoc = await getDocument(this.state);
        const tempDoc = local.getItem(docTempSaveKey, {
          title: "",
          content: "",
        });
  
        if (tempDoc.tempSaveAt && tempDoc.tempSaveAt > currentDoc.updatedAt) {
          if (confirm("Unsaved work found! Would you like to retrieve?")) {
            editor.setState({
              title: tempDoc.title,
              content: tempDoc.content,
            });

            setListScrollPos({ calculate: "current "});
            push(this.state);
            local.removeItem(docTempSaveKey)
            return;
          }
        } else {
          subdirectory.setState({
            document: currentDoc
          })
          editor.setState({
            title: currentDoc.title,
            content: currentDoc.content === null ? "" : currentDoc.content,
          });
        }
      }
    } catch(e) {
      alert(e.message);
      console.error(e);
    }
  };
}
