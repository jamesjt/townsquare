import Vue from "vue";
import App from "./App";
import store from "./store";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const faIcons = [
  "AddressCard",
  "ArrowLeft",
  "BookOpen",
  // FT-1066b: the Day-length row's mark (FT-1058c picked it; the curated
  // list never carried it, so the icon rendered as an empty comment).
  "HourglassHalf",
  "BookDead",
  "BroadcastTower",
  "Chair",
  "ChartBar",
  "Suitcase",
  "Check",
  "CheckSquare",
  "ChevronDown",
  // FT-1020: the build panel's Tower row mark (there is no clock in the
  // fork's own art set yet — same standing note as Bell/BellSlash below).
  "Clock",
  "CloudMoon",
  "Cog",
  // FT-1206: the Chat level row's mark (there is no speech mark in the fork's
  // own art set yet — the Bell/BellSlash standing note applies).
  "Comments",
  // FT-1211: the whisper DOORWAYS' mark — the seat vocabulary's Whisper row
  // (both schemes) and the click scheme's plate-side disc. The single spoken
  // message, where `Comments` above is the chat feature itself and the plane
  // below means a message SENT.
  "CommentDots",
  "Copy",
  "Clipboard",
  "Bell",
  // FT-880: the crossed bell is the refused-audio notice — a player who cannot
  // hear the call-back. (There is no bell in the fork's own art set yet; when
  // one is cut, both of these become an <img> the way the strip's marks are.)
  "BellSlash",
  "Dice",
  "DoorOpen",
  "Dragon",
  "ExchangeAlt",
  "ExclamationTriangle",
  // FT-1003: the night sheet's granted-grimoire Show control.
  "Eye",
  "FeatherAlt",
  "Fire",
  "FileCode",
  "FileUpload",
  "FlagCheckered",
  // FT-1209: the Control settings tab's three row marks (Setup panel /
  // Control scheme) and the tab's own leaf mark — the person-with-a-gear,
  // distinct from the Game settings tab's plain Cog one leaf over.
  "Font",
  "MousePointer",
  "UserCog",
  "HandPaper",
  "HandPointRight",
  "Heartbeat",
  "Home",
  "Image",
  "Link",
  "Mask",
  "MinusCircle",
  // FT-1206: the whisper's SENT face — the flying mark, the toast, the
  // composer's send button. (FT-1211: the doorways that OPEN a message moved
  // to CommentDots above; the plane stays where it means "sent".)
  "PaperPlane",
  "Pen",
  "PeopleArrows",
  "Plus",
  "PlusCircle",
  "Question",
  "Random",
  "RedoAlt",
  "Scroll",
  "SignInAlt",
  "SearchMinus",
  "SearchPlus",
  "Skull",
  "Square",
  // FT-860: the night sheet's phase bar wears the moon art for night and this
  // for day (there is no sun in our own asset set).
  "Sun",
  "TheaterMasks",
  // FT-1003: the granted grimoire's keep-shown pin.
  "Thumbtack",
  "Times",
  "TimesCircle",
  "TrashAlt",
  "Undo",
  "User",
  "UserEdit",
  "UserFriends",
  "UserSecret",
  "UserSlash",
  "Users",
  "VenusMars",
  "VolumeUp",
  "VolumeMute",
  "VoteYea",
  "Walking",
  "WindowMaximize",
  "WindowMinimize",
];
const fabIcons = ["Github", "Discord"];
library.add(
  ...faIcons.map((i) => fas["fa" + i]),
  ...fabIcons.map((i) => fab["fa" + i]),
);
Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.config.productionTip = false;

// Golem fork: the blood-drip overlay scrollbar (v-blood-scroll on any
// scroll container replaces its native bar with the drop art).
import BloodScroll from "./golem/bloodScrollbar";
Vue.directive("blood-scroll", BloodScroll);

// Golem fork (FT-1200): ask the platform who this browser is — the cookie
// rides the same-origin /api proxy, so a main-site login is a login here.
// Best-effort and async; the app boots signed-out and lights up when the
// answer lands (session.account).
// FT-1202: the personal prefs watch that same fact — bound BEFORE the /me
// ask fires, so the boot answer is caught exactly like any later login and
// the account's saved prefs come down with it (golem/prefs' account sync).
import { initAccount } from "./golem/account";
import { bindPrefsAccount } from "./golem/prefs";
bindPrefsAccount(store);
initAccount(store);

new Vue({
  render: (h) => h(App),
  store,
}).$mount("#app");
