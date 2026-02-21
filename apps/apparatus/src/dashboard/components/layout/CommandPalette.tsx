import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  Settings,
  LayoutDashboard,
  Activity,
  Shield,
  Zap,
  Globe,
  Network,
  Fingerprint,
  Moon,
  Sun
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../ui/command"
import { useTheme } from "../../theme/ThemeProvider"
import { useDocViewer } from "../../providers/DocViewerProvider"
import { HelpResults } from "./HelpResults"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState("")
  const navigate = useNavigate()
  const { toggleTheme } = useTheme()
  const { openDoc } = useDocViewer()

  // Detect if user is searching help docs
  const isHelpSearch = input.startsWith("/help")
  const helpQuery = input.startsWith("/help ") ? input.slice(6) : ""

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  const handleHelpSelect = (docId: string) => {
    setInput("")
    setOpen(false)
    openDoc(docId)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setInput("")
      }}
      title="Command palette"
      description="Search and run dashboard navigation and system commands."
    >
      <CommandInput
        placeholder="Type a command or search... (try '/help chaos')"
        value={input}
        onValueChange={setInput}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {isHelpSearch && <HelpResults query={helpQuery} onSelect={handleHelpSelect} />}

        {!isHelpSearch && (
        <>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/traffic'))}>
            <Activity className="mr-2 h-4 w-4" />
            <span>Traffic Console</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/defense'))}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Defense Rules</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/chaos'))}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Chaos Lab</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/cluster'))}>
            <Globe className="mr-2 h-4 w-4" />
            <span>Cluster Map</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dependencies'))}>
            <Network className="mr-2 h-4 w-4" />
            <span>Supply Chain</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/identity'))}>
            <Fingerprint className="mr-2 h-4 w-4" />
            <span>Identity Token Forge</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="System">
          <CommandItem onSelect={() => runCommand(() => toggleTheme())}>
            <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span>Toggle Theme</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
