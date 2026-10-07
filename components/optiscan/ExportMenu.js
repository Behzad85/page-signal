"use client";
import { CheckOutlined, ExpandMoreOutlined, ContentPasteOutlined, FileDownloadOutlined, TableChartOutlined } from "../design/icons";
import { Button } from "../design/primitives";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem } from "../ui/dropdown-menu";

export default function ExportMenu({onExportPdf,onExportCsv,onCopy,feedback=""}) {
  const actions=[{label:"Full report PDF",Icon:FileDownloadOutlined,action:onExportPdf},{label:"Current tab CSV",Icon:TableChartOutlined,action:onExportCsv},{label:"Copy current tab",Icon:ContentPasteOutlined,action:onCopy}];
  return <DropdownMenu><DropdownMenuTrigger asChild><Button leftSection={feedback?<CheckOutlined />:<FileDownloadOutlined />} rightSection={<ExpandMoreOutlined />}>{feedback||"Export"}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuGroup>{actions.map(({label,Icon,action})=><DropdownMenuItem key={label} onSelect={()=>void action?.()}><Icon />{label}</DropdownMenuItem>)}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu>;
}
