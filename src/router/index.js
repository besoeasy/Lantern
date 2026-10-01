import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import PostView from "@/views/PostView.vue";
import SettingsView from "@/views/SettingsView.vue";
import ComposeView from "@/views/ComposeView.vue";
import TagView from "@/views/TagView.vue";
import ProfileView from "@/views/ProfileView.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/compose", name: "compose", component: ComposeView },
    { path: "/tag/:tag", name: "tag", component: TagView },
    { path: "/profile/:id?", name: "profile", component: ProfileView },
    { path: "/post/:id", name: "post", component: PostView },
    { path: "/settings", name: "settings", component: SettingsView },
  ],
});

export default router;
