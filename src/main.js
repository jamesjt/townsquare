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
  "BookDead",
  "BroadcastTower",
  "Chair",
  "ChartBar",
  "Suitcase",
  "Check",
  "CheckSquare",
  "ChevronDown",
  "CloudMoon",
  "Cog",
  "Copy",
  "Clipboard",
  "Bell",
  "Dice",
  "DoorOpen",
  "Dragon",
  "ExchangeAlt",
  "ExclamationTriangle",
  "FeatherAlt",
  "Fire",
  "FileCode",
  "FileUpload",
  "FlagCheckered",
  "HandPaper",
  "HandPointRight",
  "Heartbeat",
  "Home",
  "Image",
  "Link",
  "Mask",
  "MinusCircle",
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
  "TheaterMasks",
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
  "WindowMinimize"
];
const fabIcons = ["Github", "Discord"];
library.add(
  ...faIcons.map(i => fas["fa" + i]),
  ...fabIcons.map(i => fab["fa" + i])
);
Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.config.productionTip = false;

// Golem fork: the blood-drip overlay scrollbar (v-blood-scroll on any
// scroll container replaces its native bar with the drop art).
import BloodScroll from "./golem/bloodScrollbar";
Vue.directive("blood-scroll", BloodScroll);

new Vue({
  render: h => h(App),
  store
}).$mount("#app");
