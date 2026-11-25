// The Learn tab. It keeps its own router, mounted under /learn, so its pages and the 234 widgets run as they did.
// Everything sits inside .learn, and vite.config.ts prefixes every Learn selector with it. Tokens come from :root in src/styles.css.
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/interview.css";
import "./styles/bookmarks.css";
import "./styles/mobile.css";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { LEARN_BASE } from "./engine/base.ts";

export default function Learn() {
  return (
    <div className="learn">
      <BrowserRouter basename={LEARN_BASE}>
        <App />
      </BrowserRouter>
    </div>
  );
}
