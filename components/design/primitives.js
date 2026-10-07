"use client";

import { useId, useRef } from "react";
import { cn } from "../../lib/utils";
import { Button as BaseButton } from "../ui/button";
import { ShimmerButton } from "../ui/shimmer-button";
import { Input } from "../ui/input";
import { Textarea as BaseTextarea } from "../ui/textarea";
import { Field, FieldLabel, FieldDescription } from "../ui/field";
import { Badge as BaseBadge } from "../ui/badge";
import { Alert as BaseAlert, AlertTitle, AlertDescription } from "../ui/alert";
import { Avatar as BaseAvatar, AvatarFallback } from "../ui/avatar";
import { Dialog as DialogRoot, DialogContent as DialogPanel, DialogTitle } from "../ui/dialog";
import { Tabs as TabsRoot, TabsList, TabsTrigger } from "../ui/tabs";
import { AutorenewOutlined, CloseOutlined, InfoOutlined, ErrorOutlineOutlined, ExpandMoreOutlined } from "./icons";

export function Button({ leftSection, rightSection, startIcon, variant = "filled", color, size, children, loading, disabled, radius: _radius, className, type = "button", ...props }) {
  const filled = ["filled", "contained"].includes(variant);
  const destructive = ["red", "error"].includes(color);
  const compact = size?.includes("xs") || ["sm", "small"].includes(size);
  const content = <>{loading ? <AutorenewOutlined className="animate-spin" /> : leftSection || startIcon}{children}{rightSection}</>;
  if (filled && !destructive) return <ShimmerButton aria-busy={loading || undefined} type={type} borderRadius="8px" background="var(--primary)" shimmerDuration="4s" className={cn("ps-button", compact && "ps-button-small", className)} disabled={loading || disabled} {...props}>{content}</ShimmerButton>;
  const variants = { outline: "outline", outlined: "outline", default: "outline", subtle: "ghost", text: "ghost", light: "ghost" };
  return <BaseButton aria-busy={loading || undefined} type={type} {...props} disabled={loading || disabled} variant={destructive && filled ? "destructive" : variants[variant] || "ghost"} size={compact ? "sm" : "default"} className={cn("ps-button", destructive && "text-destructive", destructive && filled && "text-white", className)}>{content}</BaseButton>;
}
export function Paper({ component: Component = "div", children, ...props }) { return <Component {...props}>{children}</Component>; }

export function TextInput({ leftSection, label, helperText, className, multiline, minRows = 3, maxRows: _maxRows, error, id: suppliedId, ...props }) {
  const generatedId = useId();
  const id = suppliedId || generatedId;
  const hint = helperText ? `${id}-hint` : undefined;
  const Control = multiline ? BaseTextarea : Input;
  return <Field className={cn("ps-field", className)} data-disabled={props.disabled || undefined} data-invalid={Boolean(error) || undefined}>
    {label && <FieldLabel htmlFor={id}>{label}{props.required && <span aria-hidden="true" className="text-muted-foreground">*</span>}</FieldLabel>}
    <div className="ps-input-wrap">{leftSection && <span className="ps-input-icon" aria-hidden="true">{leftSection}</span>}<Control {...props} id={id} rows={multiline ? minRows : undefined} aria-describedby={hint} aria-invalid={Boolean(error) || undefined} className={cn("ps-input", leftSection && "ps-input-with-icon")} /></div>
    {helperText && <FieldDescription id={hint}>{helperText}</FieldDescription>}
  </Field>;
}
export function Textarea(props) { return <TextInput {...props} multiline />; }
export function Select({ data, value, onChange, label, className, ...props }) {
  const id = useId();
  return <Field className={cn("ps-field", className)} data-disabled={props.disabled || undefined}>
    {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
    <div className="ps-input-wrap"><select {...props} id={id} value={value ?? ""} onChange={(event) => onChange?.(event.target.value)} className="ps-input ps-select">
      {data.map((item) => <option key={typeof item === "string" ? item : item.value} value={typeof item === "string" ? item : item.value} disabled={typeof item === "object" && item.disabled}>{typeof item === "string" ? item : item.label}</option>)}
    </select><ExpandMoreOutlined className="ps-select-icon" /></div>
  </Field>;
}
export function Badge({ children, leftSection, color = "gray", className }) {
  return <BaseBadge variant="outline" className={cn("ps-badge", `ps-tone-${color}`, className)}>{leftSection}{children}</BaseBadge>;
}
export function ThemeIcon({ children, size = 32, className }) {
  return <span className={cn("ps-theme-icon", className)} style={{ width: typeof size === "number" ? size : 28, height: typeof size === "number" ? size : 28 }}>{children}</span>;
}
export function Alert({ title, children, color, severity, icon, className, action, onClose }) {
  const tone = severity || ({red:"error",yellow:"warning",green:"success",blue:"info"}[color]) || "info";
  return <BaseAlert variant={tone === "error" ? "destructive" : "default"} className={cn("ps-alert", `ps-alert-${tone}`, className)}>
    {icon || (tone === "error" ? <ErrorOutlineOutlined /> : <InfoOutlined />)}
    {title && <AlertTitle>{title}</AlertTitle>}
    <AlertDescription>{children}{action}</AlertDescription>
    {onClose && <BaseButton variant="ghost" size="icon-sm" className="ps-alert-close" onClick={onClose} aria-label="Dismiss notice"><CloseOutlined /></BaseButton>}
  </BaseAlert>;
}
export function Text({ component: Component = "p", ...props }) { return <Component {...props} />; }
export function Avatar({ children, className, size = 44 }) { return <BaseAvatar className={cn("ps-avatar", className)} style={{width:size,height:size}}><AvatarFallback>{children}</AvatarFallback></BaseAvatar>; }

// Controlled dialogs may open from several triggers. Record the actual opener
// before Radix moves focus; restore it when the dialog is dismissed.
export function Dialog({ open, onClose, children, maxWidth = "sm", className, placement = "center" }) {
  const opener = useRef(null);
  return <DialogRoot open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
    <DialogPanel placement={placement} showCloseButton={false} aria-describedby={undefined} className={cn("ps-dialog", maxWidth === "xs" && "ps-dialog-small", className)} onOpenAutoFocus={() => { opener.current = document.activeElement; }} onCloseAutoFocus={(event) => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); }}>{children}</DialogPanel>
  </DialogRoot>;
}
export { DialogTitle };
export function DialogContent({ children, className }) { return <div className={cn("ps-dialog-body", className)}>{children}</div>; }
export function DialogActions({ children }) { return <div className="ps-dialog-actions">{children}</div>; }
export function Modal({ opened, onClose, children }) {
  return <Dialog open={opened} onClose={onClose}>{children}</Dialog>;
}
export function Tabs({ value, onChange, children, className, "aria-label": label }) {
  return <TabsRoot value={value} onValueChange={(id) => onChange(null,id)} className={cn("ps-tabs",className)}><TabsList variant="line" aria-label={label}>{children}</TabsList></TabsRoot>;
}
export function Tab({ value, label, icon, disabled }) { return <TabsTrigger value={value} disabled={disabled} aria-controls={undefined}>{icon}{label}</TabsTrigger>; }
export function FileButton({ onChange, accept, children }) {
  const id=useId();
  function pickFile() { document.getElementById(id)?.click(); }
  return <><input id={id} type="file" accept={accept} hidden onChange={(event) => { const file=event.target.files?.[0]; if(file) onChange(file); event.target.value=""; }} />{children({type:"button",onClick:pickFile})}</>;
}
