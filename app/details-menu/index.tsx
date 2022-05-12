import { useLocation } from "@remix-run/react";
import * as React from "react";

/**
 * An enhanced `<details>` component that's intended to be used as a menu (a bit
 * like a menu-button).
 */
export let DetailsMenu = React.forwardRef<
  HTMLDetailsElement,
  React.ComponentPropsWithRef<"details">
>((props, forwardedRef) => {
  let { onToggle, onBlur, ...rest } = props;
  let [isOpen, setIsOpen] = React.useState(false);
  let location = useLocation();

  React.useEffect(
    () => {
      if (isOpen) {
        setIsOpen(false);
      }
    },
    // eslint-disable-next-line
    [location]
  );

  return (
    <details
      ref={forwardedRef}
      open={isOpen}
      onToggle={(event) => {
        onToggle && onToggle(event);
        if (event.defaultPrevented) return;
        setIsOpen(event.currentTarget.open);
      }}
      onBlur={(event) => {
        onBlur && onBlur(event);
        if (event.defaultPrevented) return;

        // capture because react cleans up the event
        let me = event.currentTarget;

        // let focus rest with rAF
        requestAnimationFrame(() => {
          let maybeMe = document.activeElement?.closest("details");
          let activeElementIsMeOrMyPosterity = maybeMe === me;
          if (!activeElementIsMeOrMyPosterity) setIsOpen(false);
        });
      }}
      {...rest}
    />
  );
});

DetailsMenu.displayName = "DetailsMenu";
