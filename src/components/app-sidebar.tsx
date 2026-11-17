import type { ComponentProps } from "react"
import { Link, useLocation } from "react-router-dom"
import { Crosshair, ShoppingBag, Sparkles, Ticket, Users, Map, Trophy } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

const links = [
  { title: "Perfiles", url: "/", icon: Users },
  { title: "Torneos", url: "/tournaments", icon: Trophy },
  { title: "Tienda", url: "/shop", icon: ShoppingBag },
  { title: "Cosméticos", url: "/cosmetics", icon: Sparkles },
  { title: "Creadores", url: "/creator-code", icon: Ticket },
  { title: "Islas", url: "/islands", icon: Map },
]

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  return <Sidebar collapsible="offcanvas" {...props}>
    <SidebarHeader className="p-5">
      <Link to="/" className="flex items-center gap-3 font-semibold"><span className="rounded-xl bg-primary p-2 text-primary-foreground"><Crosshair className="size-5" /></span>Fortnite Tracker</Link>
    </SidebarHeader>
    <SidebarContent><SidebarGroup><SidebarGroupLabel>Explorar</SidebarGroupLabel><SidebarMenu>
      {links.map(({ title, url, icon: Icon }) => <SidebarMenuItem key={url}><SidebarMenuButton isActive={pathname === url} render={<Link to={url} />}><Icon /><span>{title}</span></SidebarMenuButton></SidebarMenuItem>)}
    </SidebarMenu></SidebarGroup></SidebarContent>
    <SidebarFooter className="p-5 text-xs text-muted-foreground">Consulta perfiles públicos de Fortnite.<br />Proyecto independiente de Epic Games.</SidebarFooter>
  </Sidebar>
}
