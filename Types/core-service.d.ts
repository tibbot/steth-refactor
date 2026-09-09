type ArrayMode = 'single' | 'multi';
/**
 * Determines if the array contains nested arrays.
 * @param arr - The array to check.
 */
declare function isMultidimensionalArray(arr: unknown[]): boolean;
/**
 * Safely parses a JSON string into an array of objects.
 * @param jsonString - The JSON string to parse.
 */
declare function parseJsonArray(jsonString: string): unknown[];
/**
 * Converts a JSON string into a structured array, optionally supporting subarrays.
 * @param jsonString - The raw JSON string.
 * @param useSubarrays - Whether to break apart comma-separated values into subarrays.
 */
declare function convertArray(jsonString: string, useSubarrays?: boolean): unknown[][];
/**
 * Shapes a raw result (e.g., from Core.post('ParameterSQL', ...))
 * into a 2D array.
 *
 * Modes:
 *  - 'single' (default)
 *      each row => Object.values(row)
 *
 *  - 'multi'
 *      each row => [ firstColumnValue, [values...] ]
 *      where values come from remaining columns; comma-separated
 *      strings are split, trimmed, and empties dropped.
 *
 * If the result cannot be interpreted as rows, returns [].
 */
declare function buildArray(result: unknown, arrType?: ArrayMode): unknown[][];

/**
 * Core        | Authentication
 * ---------------------------------------
 * Description : login handling and credential validation
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
declare function authenticateUser(callback: (user: string) => void): void;
declare function login(): Promise<void>;
declare const loginWrapped: () => Promise<void> | undefined;
declare function cancelLogin(): void;
declare function enableLogin(): void;
declare function disableLogin(): void;
declare function checkCredentials(username: string, password: string): Promise<boolean>;

/**
 * Core        | DOM Logic
 * ---------------------------------------
 * Description : grouped functions for DOM interaction
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
interface NotepadOptions {
    prefix?: string;
    labelClass?: string;
    wrapper?: (label: string, text: string, targetId: string, opts: Required<NotepadOptions>) => string;
    /** what to show when `text` is empty/null/undefined */
    emptyValue?: string;
}
/**
 * Get value or textContent of an element by ID or radio group by name.
 * @param key - Element ID or radio name
 * @param mode - 'value' (default) or 'text'
 */
declare function getElement(key: string, mode?: 'value' | 'text'): string;
/**
 * Set value or textContent of an element by ID or radio group by name.
 * @param key - Element ID or radio name
 * @param val - The value to set
 */
declare function setElement(key: string, val: string): void;
/**
 * Get value or textContent of an element by ID or radio group by name.
 * @param key - checkbox or radio name
 */
declare function isChecked(key: string): boolean;
/**
 * Update the innerHTML of an element if it exists.
 * @param id - Element ID
 * @param text - string to be written to the innerHTML
 */
declare function setInnerTextIfExists(id: string, text: string): void;
/**
 * Clear value/textContent of an element or uncheck a radio group by name.
 * @param key - Element ID or radio name
 */
declare function clearElement(key: string | HTMLElement): void;
/** @deprecated Use getElement instead. */
declare function getElementValue(id: string): string;
/** @deprecated Use setElement instead. */
declare function setElementValue(id: string, val: string): void;
/** @deprecated Use getElement with 'text' mode instead. */
declare function getElementTextContent(id: string): string;
/** @deprecated Use setElement instead. */
declare function setElementTextContent(id: string, val: string): void;
/** @deprecated Use setElement instead. */
declare function setRadioChecked(name: string, val: string): void;
/** @deprecated Use clearElement instead. */
declare function clearRadioChecked(name: string): void;
/** @deprecated Use getElement instead. */
declare function getRadioChecked(name: string): string | null;
/** @deprecated Use setElement instead. */
declare function setSelected(name: string, val: string): void;
/** Get value or textContent of an input-like element. */
declare function getInput(el: HTMLInputElement | HTMLTextAreaElement | null): string;
/** Clear value or textContent of an input-like element. */
declare function clearInput(el: HTMLInputElement | HTMLTextAreaElement | null): void;
/**
 * Populate a <select> element with options.
 * @param id - Element ID
 * @param arr - Option values
 * @param empty - Whether to add an empty default option
 */
declare function buildSelect(id: string, data: string[] | string, empty?: boolean): void;
/**
 * Build a modal dropdown selector using provided options.
 * @param title - Modal header
 * @param arr - Option values
 * @returns Selected value
 */
declare function chooseDropDown(title: string, arr: string[]): Promise<string>;
/** Internal helper to finalize modal dropdown selection. */
declare function getDropDownSelect(el: HTMLSelectElement, resolve: (val: string) => void): void;
/**
 * Update a notepad-style label area with text and optional prefix/options.
 */
declare function updateNotepad(targetId: string, label: string, text: string, options?: NotepadOptions, pref?: string): void;
/** Set label text based on array for a slider component. */
declare function setSliderLabels(id: string, labels: string[]): void;
/** Highlight the active slider label based on input value. */
declare function updateSliderLabels(sliderEl: HTMLInputElement): void;
/** Internal callback map for referencing UI interactions. */
declare const callbackMap: Map<string, (...args: unknown[]) => void>;
/** Register a named callback for reuse. */
declare function registerCallback(item: string, fn: (...args: unknown[]) => void): void;
/** Decode HTML entities from a string. */
declare function decodeEntities(str: string): string;
/** PREF interface to attachEventListeners. */
interface EventListenerConfig {
    /** A CSS selector (e.g. '.foo', '#bar') or an ID string (without the '#') */
    target: string;
    /** Any DOM event name (e.g. 'click', 'input', 'blur', 'change', …) */
    event: string;
    /** Anything you could pass to addEventListener—(ev: Event) => void or an object */
    handler: EventListener;
}
/**
 * Attach event listeners to multiple elements.
 * @param listeners - An array of EventListenerDescriptor
 */
declare function attachEventListeners(configs: EventListenerConfig[]): void;
/** Fade out and hide an element using CSS opacity transition. */
declare function fadeOutAndHide(element: HTMLElement): void;
declare function isDate(value: string): boolean;
declare function resetControls(container: string | HTMLElement): void;
declare function serializeFragment(fragment: DocumentFragment): string;
declare function collectInput(container: string | HTMLElement, selector?: string): Record<string, string>;

/**
 * Core        | cgui
 * ---------------------------------------
 * Description : builds the user interface
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */

interface ListenerSubsets {
    main: EventListenerConfig[];
    [subsetName: string]: EventListenerConfig[];
}
interface coreAppConfig {
    id: number;
    abbr: string;
    snips: {
        [key: string]: string;
    };
    listeners: ListenerSubsets;
}
declare function buildInterface(coreConfig: coreAppConfig): Promise<void>;

/**
 * Core        | Cmon
 * ---------------------------------------
 * Description : Utility for cookie retrieval and assignment
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
/**
 * Retrieves a cookie value by name.
 * @param name - The logical (unprefixed) cookie name.
 * @returns The cookie value, or null if not found.
 */
declare function getCookie(name: string): string | null;
/**
 * Sets a cookie with the given logical (unprefixed) name and value.
 * @param name - The cookie name.
 * @param value - The cookie value.
 * @param days - Number of days until expiration (default: 365).
 */
declare function setCookie(name: string, value: string, days?: number): void;

/**
 * Core        | CSS
 * ---------------------------------------
 * Description : Dynamic, dependency-aware CSS injection
 * Author      : wogi
 * Converted   : 2025-05-01
 * © 2025 tibbot, inc. all rights reserved
 */
type CSSBundle = {
    name: string;
    files: string[];
    dependsOn?: string[];
};
/**
 * Core CSS bundle with primary component styles.
 */
declare const coreCSSBundle: CSSBundle;
/**
 * Injects a CSS file into the current document if not already present.
 * @param href - The path to the CSS file.
 */
declare function injectCSS(href: string): void;
/**
 * Injects a full CSS bundle and its dependencies in declared order.
 * @param bundle - A CSS bundle descriptor.
 */
declare function injectCSSBundle(bundle: CSSBundle): void;
/**
 * Injects the main Core CSS bundle.
 */
declare function injectCoreCSS(): void;

/**
 * Core        | Display Logic
 * ---------------------------------------
 * Description : functions for display, visibility, and CSS class manipulation
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
/**
 * @deprecated Use el.style.display = "" instead.
 * Show an element by ID.
 */
declare function showElement(elementId: string): void;
/**
 * @deprecated Use el.style.display = "none" instead.
 * Hide an element by ID.
 */
declare function hideElement(elementId: string): void;
/**
 * @deprecated Use element.classList.add(...) instead.
 * Add a CSS class to an element.
 */
declare function addClass(element: HTMLElement, className: string): void;
/**
 * @deprecated Use element.classList.remove(...) instead.
 * Remove a CSS class from an element.
 */
declare function removeClass(element: HTMLElement, className: string): void;
/**
 * @deprecated Use conditional el.style.display assignment instead.
 * Toggle display based on current style.
 */
declare function toggleElementDisplay(element: HTMLElement, displayStyle?: string, hiddenStyle?: string): void;
/** Toggle visibility class on an element (migrating to doml).
 * @deprecated Use element.classList.toggle(hidden) instead.
 */
declare function toggleHiddenClass(element: HTMLElement): void;
/** Get the ID of the currently visible panel (assumes panels have 'panel' class). */
declare function getActivePanel(): string | null;
/** Show only the panel with the given ID, hiding others. */
declare function showPanel(panelId: string): void;
/**
 * Toggle visibility of the application menu.
 */
declare function toggleMenu(): void;

/**
 * Core        | Mediator
 * ---------------------------------------
 * Description : shared control/focus broker between actors
 * Author      : wogi
 * Created     : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
type ActorName = string;
type DelegationId = string;
type MessageHandler = (message: any) => void;
interface DelegationMessage {
    id: string;
    from: ActorName;
    to?: ActorName | null;
    status?: 'active' | 'completed' | 'cancelled';
    statusCode?: number;
    result?: Record<string, unknown>;
    payload?: any;
}
interface ReleaseFocusOptions {
    returningToken?: boolean;
}
declare function createDelegation(fromActor: ActorName, payload?: {}): DelegationMessage;
declare function claimDelegation(toActor: ActorName): DelegationMessage | null;
declare function completeDelegation(delegationId: DelegationId, result?: {
    success: boolean;
}): void;
declare function completeDelegationByActor(toActor: ActorName, result?: {
    success: boolean;
}): void;
declare function abortDelegation(delegationId: DelegationId): void;
declare function abortDelegationByActor(fromActor: ActorName): void;
declare function getDelegation(actorName: ActorName): DelegationMessage | null;
declare function isDelegating(actorName: ActorName): boolean;
declare function registerActor(actorName: ActorName, lifecycleCallbacks?: {}): boolean;
declare function unregisterActor(actorName: ActorName): void;
declare function subscribe(actorName: ActorName, listener: MessageHandler): void;
declare function unsubscribe(actorName: ActorName, listener?: MessageHandler): void;
/**
 * Requests UI focus for a specific actor.
 * @param actorName - The identifier of the actor requesting focus.
 * @returns DelegationMessage if focus was granted, null otherwise.
 */
declare function acquireFocus(actorName: ActorName): DelegationMessage | null;
declare function releaseFocus(actor: ActorName, reason?: string, options?: ReleaseFocusOptions): void;
declare function subscribeToFocus(listener: MessageHandler): void;
declare function unsubscribeFromFocus(listener: MessageHandler): void;
declare function subscribeToDelegation(delegationId: DelegationId, listener: MessageHandler): void;
declare function unsubscribeFromDelegation(delegationId: DelegationId): void;
declare function releaseAllFocus(): void;
declare function whoHasFocus(): ActorName | null;

declare const __mdtr_abortDelegation: typeof abortDelegation;
declare const __mdtr_abortDelegationByActor: typeof abortDelegationByActor;
declare const __mdtr_acquireFocus: typeof acquireFocus;
declare const __mdtr_claimDelegation: typeof claimDelegation;
declare const __mdtr_completeDelegation: typeof completeDelegation;
declare const __mdtr_completeDelegationByActor: typeof completeDelegationByActor;
declare const __mdtr_createDelegation: typeof createDelegation;
declare const __mdtr_getDelegation: typeof getDelegation;
declare const __mdtr_isDelegating: typeof isDelegating;
declare const __mdtr_registerActor: typeof registerActor;
declare const __mdtr_releaseAllFocus: typeof releaseAllFocus;
declare const __mdtr_releaseFocus: typeof releaseFocus;
declare const __mdtr_subscribe: typeof subscribe;
declare const __mdtr_subscribeToDelegation: typeof subscribeToDelegation;
declare const __mdtr_subscribeToFocus: typeof subscribeToFocus;
declare const __mdtr_unregisterActor: typeof unregisterActor;
declare const __mdtr_unsubscribe: typeof unsubscribe;
declare const __mdtr_unsubscribeFromDelegation: typeof unsubscribeFromDelegation;
declare const __mdtr_unsubscribeFromFocus: typeof unsubscribeFromFocus;
declare const __mdtr_whoHasFocus: typeof whoHasFocus;
declare namespace __mdtr {
  export {
    __mdtr_abortDelegation as abortDelegation,
    __mdtr_abortDelegationByActor as abortDelegationByActor,
    __mdtr_acquireFocus as acquireFocus,
    __mdtr_claimDelegation as claimDelegation,
    __mdtr_completeDelegation as completeDelegation,
    __mdtr_completeDelegationByActor as completeDelegationByActor,
    __mdtr_createDelegation as createDelegation,
    __mdtr_getDelegation as getDelegation,
    __mdtr_isDelegating as isDelegating,
    __mdtr_registerActor as registerActor,
    __mdtr_releaseAllFocus as releaseAllFocus,
    __mdtr_releaseFocus as releaseFocus,
    __mdtr_subscribe as subscribe,
    __mdtr_subscribeToDelegation as subscribeToDelegation,
    __mdtr_subscribeToFocus as subscribeToFocus,
    __mdtr_unregisterActor as unregisterActor,
    __mdtr_unsubscribe as unsubscribe,
    __mdtr_unsubscribeFromDelegation as unsubscribeFromDelegation,
    __mdtr_unsubscribeFromFocus as unsubscribeFromFocus,
    __mdtr_whoHasFocus as whoHasFocus,
  };
}

/**
 * Core        | Dock
 * ---------------------------------------
 * Description : Button/Panel coordination
 * Author      : wogi
 * Created     : 2024-04-02
 * © 2025 tibbot, inc. all rights reserved
 */
declare function hireMediatorForDock(mdtrInstance: typeof __mdtr): void;
interface DockConfig {
    container: HTMLDivElement;
    items: DockItem[];
    onDestroy?: () => void;
}
interface DockItem {
    title: string;
    content: string;
}
declare class Dock {
    private container;
    private items;
    private onDestroy;
    private actorName;
    private activeButton;
    private animating;
    private canDismiss;
    private buttons;
    private panel;
    private activeDelegationId;
    private destroyed;
    private dockTopLeft;
    private BTN_PER_ROW;
    constructor(options: DockConfig);
    private init;
    private handleKeydown;
    private handleResize;
    private createDiv;
    private getOffset;
    private getDestination;
    showDockPanel(button: HTMLDivElement, title: string, content: string | HTMLElement): void;
    _fadeTo(title: string, content: string, nextButton: HTMLDivElement): Promise<void>;
    hideDockPanel(button: HTMLDivElement): void;
    updateDockSpacer(): void;
    private mediatorInit;
    private mediatorRelease;
    private handleDelegationMessage;
    private handleFocusChange;
    private mediatorDelegate;
    private mediatorRequestFocus;
    private mediatorReleaseFocus;
    private mediatorCancelDelegation;
    private mediatorCompleteDelegation;
    destroy(): void;
}

/**
 * Core        | Earl
 * ---------------------------------------
 * Description : Centralized error, alert, and logging utilities
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
/**
 * Logs an error to the console with context.
 * @param context - A label or source identifier.
 * @param err - The error object or message.
 */
declare function error(context: string, err: unknown): void;
/**
 * Logs a warning to the console with context.
 * @param context - A label or source identifier.
 * @param message - The warning message.
 */
declare function warn(context: string, message: string): void;
/**
 * Logs a general informational message with context.
 * @param context - The label or component name.
 * @param message - The informational message.
 */
declare function info(context: string, message: string): void;
/**
 * Wraps a function with try/catch and logs errors with context.
 * Supports arbitrary function signatures.
 *
 * @param context - The context label for error logging.
 * @param fn - The function to execute.
 * @param fallback - Optional fallback value to return on failure.
 * @returns A new function with the same signature as `fn`.
 */
declare function wrap<T extends (...args: any[]) => any>(context: string, fn: T, fallback: ReturnType<T>): (...args: Parameters<T>) => ReturnType<T>;
declare function wrap<T extends (...args: any[]) => any>(context: string, fn: T): (...args: Parameters<T>) => ReturnType<T> | undefined;

type CaseType = 'word' | 'sentence' | 'lower' | 'default';
/**
 * Determines whether a given value is null, undefined, or an empty string.
 * @param str - The value to evaluate.
 * @returns True if the value is null, undefined, or an empty string.
 */
declare const isNullOrEmpty: (str: unknown) => boolean;
/**
 * Pads a string or number with leading zeros to match a desired length.
 * @param num - The number or string to pad.
 * @param length - The total desired length of the output string.
 * @returns A zero-padded string.
 */
declare const pad: (num: string | number, length: number) => string;
/**
 * Transforms a string according to the specified case rule.
 * @param input - The text to transform.
 * @param type - The transformation type: 'word', 'sentence', 'lower', or 'default' (upper).
 * @returns The transformed string.
 */
declare function changeCase(input: string, type?: CaseType): string;
/**
 * Detects a DOM element with a `data-name="change-case-..."` attribute and transforms its value.
 * Typically used in `input` event listeners.
 * @param event - The DOM event triggering the handler.
 */
declare function handleCaseChange(event: Event): void;
/**
 * Formats a string of digits into a U.S. phone number pattern.
 * Optionally appends an extension if type is 'e'.
 * @param input - The input string containing numeric characters.
 * @param type - Format type: 'p' (default) or 'e' for extension.
 * @returns Formatted telephone string.
 */
declare function prettyTel(input: string, type?: string): string;
/**
 * Formats a raw numeric string into a standard MM/DD/YYYY date format.
 * @param input - The input string containing numeric characters.
 * @returns A formatted date string.
 */
declare function prettyDate(input: string): string;
declare function prettyCurrency(input: string): string;
/**
 * Converts a single-digit number to a two-character string with a leading zero.
 * @param unit - The numeric value to format.
 * @returns A zero-padded string representation.
 */
declare const formatTime: (unit: number) => string;
/**
 * Formats a number into USD currency format.
 * @param value - The numeric value to format.
 * @returns A string formatted as U.S. currency.
 */
declare function formatCurrency(value: number): string;
/**
 * Determines the appropriate indefinite article ('a' or 'an') for a given noun.
 * @param noun - The word to evaluate.
 * @returns 'a' or 'an' depending on the first letter of the word.
 */
declare function getArticle(noun: string): string;

/**
 * Core        | Load
 * ---------------------------------------
 * Description : Loading overlay manager
 * Author      : wogi
 * Refactored  : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
/**
 * Creates and displays the loading overlay.
 */
declare function presentSpinner(variant?: string): void;
/**
 * Removes the loading overlay from the DOM.
 */
declare function dismissSpinner(): void;

/**
 * Core        | Modal Modl
 * ---------------------------------------
 * Description : Modal window management and control
 * Author      : wogi
 * Refactored  : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
/**
 * Creates and displays a modal using the provided content fragment.
 * @param snip - A DocumentFragment or HTML Element to inject into the modal.
 * @param width - Optional width string (e.g., '400px').
 */
declare function drawModal(snip: DocumentFragment | HTMLElement, width: string): void;
/**
 * Removes the modal from the DOM.
 */
declare function dismissModal(): void;
/**
 * Displays an alert modal with a message.
 * @param snip - A DocumentFragment containing the alert UI.
 * @param msg - The message to display.
 * @param hdr - Optional header text.
 */
declare function drawAlert(snip: DocumentFragment, msg: string, hdr?: string): void;
/**
 * Displays a confirmation modal with a message and confirmation handler.
 * @param snip - A DocumentFragment containing the confirm UI.
 * @param msg - The message to display.
 * @param yesFunction - Function to call when user confirms.
 * @param hdr - Optional header text.
 */
declare function drawConfirm(snip: DocumentFragment, msg: string, yesFunction: () => void, hdr?: string): void;
/**
 * Displays an alert modal and resolves a promise when cancelled.
 * @param snip - A DocumentFragment to render in the modal.
 * @param message - The message to display.
 * @returns A promise resolved when the modal is dismissed.
 */
declare function displayAsyncModal(snip: DocumentFragment, message: string): Promise<void>;

/**
 * Core        | Pref
 * ---------------------------------------
 * Description : User preference handling (theme, scheme, font)
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
/**
 * Applies the given theme (e.g., 'jedi' or 'sith') to the document root.
 * @param mode - The theme name.
 */
declare function setMode(mode: string): void;
/**
 * Applies the given color scheme (e.g., 'blue', 'burnt') to the document root.
 * @param scheme - The scheme name.
 */
declare function setColorScheme(scheme: string): void;
/**
 * Applies the given font scheme (e.g., 'modern', 'classic') to the document root.
 * @param font - The font scheme name.
 */
declare function setFont(font: string): void;
/**
 * Initializes user preferences from cookies and applies them.
 */
declare function initPreferences(): void;
/**
 * Launches the preferences interface via snippet render.
 * @param snip - The snippet rendering utility.
 */
declare function showPreferences(pref: string): void;

/**
 * Core        | Razr
 * ---------------------------------------
 * Description : Razor/MVC AJAX fetch adapter for CoreService
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
interface RazrParams {
    [key: string]: any;
}
interface RazrOptions extends Omit<RequestInit, 'headers' | 'body' | 'method'> {
    method: RequestInit['method'];
    headers: Record<string, string>;
    body?: string;
    credentials?: RequestCredentials;
}
/**
 * Encapsulates CoreService AJAX calls to Razor-compatible MVC endpoints.
 * Handles CSRF protection, base URL resolution, and error-wrapped fetch.
 */
declare class Razr {
    #private;
    fallback: Promise<Response>;
    /**
     * Initializes the Razr instance using global Razor variables.
     */
    constructor();
    /**
     * Issues a GET request with query parameters.
     * @param params - Query string parameters.
     * @param chunk - Unused flag, reserved for future streaming.
     */
    get(params: RazrParams, chunk?: boolean): Promise<any>;
    /**
     * Issues a POST request with query parameters and JSON body.
     * @param params - Query string parameters.
     * @param payload - Request body to send.
     */
    post(params: RazrParams, payload: any): Promise<any>;
}
declare function get(params: RazrParams): Promise<any>;
declare function post(handler: string, payload: any): Promise<any>;

/**
 * Core        | Sldr (Slider)
 * ---------------------------------------
 * Description : visual selector for sliding options
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
declare function hireMediatorForSldr(mdtrInstance: typeof __mdtr): void;
interface SliderConfig {
    geometry: "curve" | "fan" | "flat" | "deck" | "spiral" | "wave";
    direction: "up" | "down";
    scale: number;
    overlay: number;
    transitions: boolean;
}
interface CardData {
    id: number;
    name: string;
    detail?: any[];
}
interface SldrConfig<T extends {
    id: number | string;
}> {
    sliderSubject: string;
    sliderId: string;
    showRangeSlider: boolean;
    /** the function to call when “Details” is clicked (or null) */
    detailFunction: ((id: T["id"]) => void) | null;
    showDetailButton: boolean;
    detailButtonLabel: string;
    /** which card ID should receive initial focus? */
    initialFocusId: number | null;
    /** which card ID should be initially selected? */
    initialSelectedId: number | null;
    /** which fields of T you want to expose in the slider? */
    sliderFields: Array<keyof T> | null;
    /** any deeper slider tweaks */
    sliderConfig: Partial<SliderConfig>;
}
interface SldrOptions<T extends {
    id: number | string;
}> {
    container: HTMLElement;
    cards: CardData[];
    config?: Partial<SldrConfig<T>>;
}
declare class Sldr<T extends {
    id: number | string;
} = CardData> {
    private container;
    private cards;
    private config;
    private currentIndex;
    private actorName;
    private lockSVG;
    private sldrId;
    private rangeSlider;
    private selectedId;
    private explicitlySelected;
    private eventListeners;
    private sliderDocumentWidth;
    private activeDelegationId;
    private homeButton;
    private pickButton;
    private handleExpiration?;
    constructor(options: SldrOptions<T>);
    init(): void;
    private setSliderConfig;
    registerListener<K extends keyof HTMLElementEventMap>(elementId: string, eventName: K, listenerFn: (e: HTMLElementEventMap[K]) => void, delegationAware?: boolean): void;
    private detachEvents;
    private reattachEvents;
    private unregisterAllListeners;
    showDetails(id: number): void;
    private hideDetails;
    private handleKeydown;
    private createLayout;
    private getFocusedId;
    private getSelectedId;
    private focusOnId;
    private handleSliderDocumentClick;
    private buildSlider;
    private updateSliderView;
    private applyGeometryAndScale;
    private showDelegationCancelControl;
    private removeDelegationCancelControl;
    private renderDetailButton;
    private attachEvents;
    private handleMouseWheel;
    private clampIndex;
    private movePrevious;
    private moveNext;
    private moveFirst;
    private moveLast;
    private mediatorInit;
    private mediatorRelease;
    private handleDelegationMessage;
    private handleFocusChange;
    private mediatorDelegate;
    private mediatorRequestFocus;
    private mediatorReleaseFocus;
    private mediatorCancelDelegation;
    private mediatorCompleteDelegation;
    destroy(): void;
}

/**
 * Core        | Snip
 * ---------------------------------------
 * Description : Snippet rendering engine for CoreService
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
interface RawSnipRecipe {
    element_id: number;
    snip_name: string;
    tag: string;
    sequence: number;
    attribute: string;
}
declare class SnipEngine {
    #private;
    /**
     * Loads the cookbook (snip definitions) into memory.
     * @param cookbook - A map of snip name to array of SnipRecipe rows.
     */
    loadCookbook(raw: RawSnipRecipe[]): void;
    /**
     * Builds a snippet as a DocumentFragment from stored recipe.
     * @param name - The name of the snippet.
     * @returns The constructed DocumentFragment.
     */
    buildSnippet(name: string): DocumentFragment;
    /**
     * Renders a snippet by name into a target DOM element.
     * @param name - The snippet name.
     * @param target - The element to receive the DOM fragment.
     * @param preserve - If true, cache the built fragment after first render (default: true).
     */
    renderSnippet(name: string, target: HTMLElement, preserve?: boolean): void;
}
/**
 * Initializes SnipEngine with a preloaded cookbook.
 * @param cookbook - A map of snip names to recipes.
 */
declare function initSnip(cookbook: RawSnipRecipe[]): SnipEngine;
/**
 * Provides the global Snip instance.
 */
declare function getSnip(): SnipEngine | undefined;
/**
 * Renders a snippet directly using the global Snip instance.
 * @param name - The snippet name.
 * @param target - The element to receive the DOM fragment.
 * @param preserve - Whether to cache the fragment after building.
 */
declare function renderSnip(name: string, target: HTMLElement, preserve?: boolean): void;
/**
 * builds a UI based on an ordered array of snip names and targets.
 * @param Snip - the active SnipEngine
 * @param uiMap - { snipName, targetId }.
 */
declare function buildUi<T extends Record<string, string>>(uiMap: T): void;
declare function buildSnip(name: string): DocumentFragment;

/**
 * Core        | Table Management
 * ---------------------------------------
 * Description : DOM helpers for interactive HTML tables
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
declare let selectedResultRow: string | null;
/**
 * Build a table element using headers and 2D string data.
 * @param data - Row data to populate the table body.
 * @param headers - Column headers.
 * @param name - The ID to assign to the table.
 * @returns A fully constructed HTMLTableElement.
 */
declare function buildTable(data: string[][], headers: string[], name: string): HTMLTableElement;
/**
 * Check if a string contains a valid table with at least one row.
 * @param htmlString - The HTML string to check.
 * @returns True if a table is present with data rows; otherwise false.
 */
declare function hasRows(htmlString: string): boolean;
/**
 * Check if a string contains a valid table with at least one row.
 * @param htmlString - The HTML string to check.
 * @returns True if a table is present with data rows; otherwise false.
 */
declare function parseTableFromString(htmlString: string): HTMLTableElement | null;
/**
 * Selects a table row, stores its ID, and invokes a callback with it.
 * @param tbl - The source table.
 * @param row - The selected row element.
 * @param cell - The selected cell element.
 * @param resolve - Callback to receive the selected row's ID.
 */
declare function getSelectedTableRow(tbl: HTMLTableElement, row: HTMLTableRowElement, cell: HTMLTableCellElement, resolve: (value: string) => void): void;
/**
 * Sorts a column in the specified table and toggles the sort direction.
 * @param tableId - ID of the table.
 * @param colIndex - Index of the column to sort.
 * @param header - The header cell clicked.
 */
declare function sortTable(tableId: string, colIndex: number, header: HTMLTableCellElement): void;
/**
 * Adds click handlers to each table header to enable sorting.
 * @param tableId - ID of the table.
 */
declare function makeTableSortable(tableOrId: string | HTMLTableElement): void;
/**
 * Returns the number of rows in the table.
 * @param tableId - ID of the table.
 * @returns The row count or 0.
 */
declare function getTableRowCount(tableOrId: string | HTMLTableElement): number;
/**
 * Highlights a specific row in the table visually.
 * @param row - The row to highlight.
 * @param cell - Optional cell index to style.
 */
declare function highlightTableRow(row: HTMLTableRowElement, cell?: number): void;
/**
 * Removes visual highlight styles from all rows.
 * @param tbl - The table or table.id to clear highlighting from.
 */
declare function removeHighlight(tbl: HTMLTableElement | string): void;
/**
 * Adds an event listener to each row in the table.
 * @param tableId - ID of the table.
 * @param eventType - The event to listen for (e.g., 'click').
 * @param rowFunction - Callback to invoke with the row.
 */
declare function addTrListener(tableId: string, eventType: keyof HTMLElementEventMap, rowFunction: (row: HTMLTableRowElement) => void): void;
/**
 * Inserts a checkbox for each row.
 * @param tbl - The table or table.id to clear highlighting from.
 * @param columnIndex - Where to insert the checkbox in the row.
 * @param includeMaster - Include master checkbox in header to select/de-select all.
 */
declare function insertCheckboxColumn(tableOrId: HTMLTableElement | string, columnIndex?: number, includeMaster?: boolean): void;
/**
 * Clones a table and updates ids.
 * @param tbl - The table or table.id to clear highlighting from.
 * @param newTableId - id attribute for the new table.
 * @param childIdPrefix - Prefix for existing ids inside the table.
 * @returns The cloned table or null.
 */
declare function cloneTable(tableOrId: HTMLTableElement | string, newTableId: string, childIdPrefix: string): HTMLTableElement | null;
/**
 * Counts rows where checkbox is checked
 * @param tbl - The table or table.id to clear highlighting from.
 * @returns The count of selected rows.
 */
declare function countCheckedRows(tableOrId: HTMLTableElement | string): number | null;

/**
 * Core        | Util
 * ---------------------------------------
 * Description : Utility functions for CoreService
 * Author      : wogi
 * Converted   : 2025-05-02
 * © 2025 tibbot, inc. all rights reserved
 */
/**
 * Execute an asynchronous function while automatically managing a loading spinner.
 * @template T The return type of the wrapped async function
 * @param fn - A function that returns a Promise
 * @returns A Promise resolving to the result of `fn`
 */
declare function withSpinner<T>(fn: () => Promise<T>): Promise<T>;
declare function handleMenuClick(event: MouseEvent): void;
declare function getTimestampedFilename(base?: string, ext?: string): string;

/**
 * Core        | Vldt
 * ---------------------------------------
 * Description : validation utility for CoreService
 * Author      : wogi
 * Converted   : 2025-06-02
 * © 2025 tibbot, inc. all rights reserved
 */
type ValidatorFn = (value: string, context?: Record<string, string>) => boolean | string | Promise<boolean | string>;
interface FieldRule {
    id: string;
    selector?: string;
    required?: boolean;
    validate?: ValidatorFn;
    error?: string;
    errorClass?: string;
    debounceMs?: number;
    modalNotify?: boolean;
    showInlineMessage?: boolean;
    onFail?: (el: HTMLElement, message: string, context?: Record<string, string>) => void;
}
interface GroupRule {
    ids: string[];
    validate: (values: Record<string, string>) => string | null | Promise<string | null>;
    message?: string;
    errorClass?: string;
    activeIf?: (values: Record<string, string>) => boolean;
}
interface ValidationResult {
    id: string;
    valid: boolean;
    message?: string;
    className?: string;
}
declare const rules: Record<string, ValidatorFn | ((...args: any[]) => ValidatorFn)>;
declare function showVldtSummaryModal(results: ValidationResult[]): Promise<void>;
declare function validateField(rule: FieldRule, allValues: Record<string, string>, mode?: 'inProcess' | 'final'): Promise<ValidationResult>;
declare function validateForm(schema: FieldRule[], values: Record<string, string>, mode?: 'inProcess' | 'final', groupRules?: GroupRule[]): Promise<ValidationResult[]>;
declare function formatErrors(results: ValidationResult[]): string;

/**
 * Core        | File
 * ---------------------------------------
 * Description : file export utility
 * Author      : wogi
 * Converted   : 2025-07-02
 * © 2025 tibbot, inc. all rights reserved
 */
interface ExportOptions {
    delimiter?: ',' | '\t';
    filenameStub?: string;
}
/**
 * Main export function.
 * @param input - string (JSON or <table> as string).
 * @param options - delimiter (CSV/Tab), filenameStub (export), fileExtension (.csv/.txt)
 * @returns A zero-padded string representation.
 */
declare function exportToDelimited(input: string, options?: ExportOptions): Promise<void>;

/**
 * Core        | clct
 * ---------------------------------------
 * Description : dynamic tabbed collections
 * Author      : wogi
 * Converted   : 2025-12-14
 * © 2025 tibbot, inc. all rights reserved
 */
type SqlParam$1 = {
    name: string;
    value: unknown;
    type?: string;
};
interface ClctContext {
    subjectId: string;
}
type PanelKind = 'table' | 'snip';
interface ClctPanelSpec {
    kind: PanelKind;
    sp: string;
    params: (ctx: ClctContext) => SqlParam$1[];
    tableId?: string;
    sortable?: boolean;
    selectable?: boolean;
    rowCountInTab?: boolean;
    snip?: string;
}
interface ClctDetailSpec {
    sp: string;
    params: (rowId: string, ctx: ClctContext) => SqlParam$1[];
    snip: string;
    canChoose?: boolean;
}
interface ClctTab {
    key: string;
    label: string;
    panel: ClctPanelSpec;
    detail?: ClctDetailSpec;
}
interface ClctBlueprint {
    tabs: ClctTab[];
    autoHydrate?: boolean;
}
interface DetailRequest {
    tabKey: string;
    tabLabel: string;
    rowId: string;
    detail: ClctDetailSpec;
    ctx: ClctContext;
}
interface ClctCallbacks {
    onClearChoice?: () => void;
    onFocusChange?: (info: {
        tabKey: string;
        rowId: string;
    }) => void;
    onShowDetail?: (req: DetailRequest) => void;
}
declare class Clct {
    private host;
    private bp;
    private ctx;
    private cb;
    private tabsEl;
    private pnlsEl;
    private actionsEl;
    private showDetailBtn;
    private activeTabKey;
    private focusByTab;
    constructor(args: {
        host: HTMLElement;
        blueprint: ClctBlueprint;
        ctx: ClctContext;
        callbacks?: ClctCallbacks;
    });
    build(): Promise<void>;
    destroy(): void;
    hydrate(ctx: ClctContext): Promise<void>;
    getDetailRequest(): DetailRequest | null;
    private _drawShell;
    private _drawTabsAndPanels;
    private _activateTab;
    private _syncShowDetailEnabled;
    private _hydrateTab;
    private _setTabRowCount;
    private _toRazrParams;
}

/**
 * Core        | detl
 * ---------------------------------------
 * Description : dynamic detail render
 * Author      : wogi
 * Converted   : 2025-12-14
 * © 2025 tibbot, inc. all rights reserved
 */
type SqlParam = {
    key: string;
    value: unknown;
    type?: string;
};
interface DetlContext {
    rowId: string;
    tabKey?: string;
    tabLabel?: string;
}
interface DetlBlueprint {
    sp: string;
    params: (ctx: DetlContext) => SqlParam[];
    contentSnipId?: string;
    title?: (ctx: DetlContext, row?: Record<string, unknown>) => string;
    subtitle?: (ctx: DetlContext, row?: Record<string, unknown>) => string;
    canChoose?: boolean;
    canClearAfterChoose?: boolean;
    canClose?: boolean;
    startCollapsed?: boolean;
    bindScopeSelector?: string;
}
interface DetlIO {
    buildSnip?: (snipId: string) => DocumentFragment | HTMLElement | null;
    postParam?: (sp: string, params: SqlParam[]) => Promise<any>;
}
interface DetlChoice {
    id: string;
    tabKey?: string;
    tabLabel?: string;
}
interface DetlCallbacks {
    onChoose?: (choice: DetlChoice) => void;
    onClear?: () => void;
    onClose?: () => void;
}
declare class Detl {
    private host;
    private bp;
    private ctx;
    private io;
    private cb;
    private detlEl;
    private hdrEl;
    private iconEl;
    private dataEl;
    private titleEl;
    private btnChoose;
    private btnClear;
    private btnClose;
    private isChosen;
    private _listenersAttached;
    private _onHdrClick;
    private _onIconClick;
    constructor(args: {
        host: HTMLElement;
        blueprint: DetlBlueprint;
        ctx: DetlContext;
        io: DetlIO;
        callbacks?: DetlCallbacks;
    });
    build(): Promise<void>;
    destroy(): void;
    toggle(): void;
    collapse(): void;
    expand(): void;
    private _toRazrParams;
    private _syncIcon;
    private _injectHdrChrome;
    private _mkBtn;
    private _fetchDetailRow;
    private _firstRow;
    private _setHeaderText;
    private _bindRow;
    private _renderEmptyState;
    private _handleChoose;
    private _handleClear;
    private _handleClose;
    private _esc;
}

/**
 * Core        | bind
 * ---------------------------------------
 * Description : DOM binding utilities
 * Author      : wogi
 * Converted   : 2025-12-19
 * © 2025 tibbot, inc. all rights reserved
 */
interface DispPayload {
    bind: Record<string, unknown>;
    tables?: unknown;
    selected?: unknown;
    meta?: unknown;
}
type BindingsInput = Record<string, unknown> | DispPayload;
interface BindOptions {
    /** Attribute used to locate bind points. Default: 'data-bind' */
    attr?: string;
    /**
     * If true, throw when a bind key exists but no DOM target exists in scope.
     * Default: false.
     */
    strict?: boolean;
    /**
     * Optional per-key formatter (e.g., phone/date/zip). Runs before applying.
     */
    formatters?: Record<string, (v: unknown) => string>;
}
interface BindResult {
    applied: number;
    missing: string[];
}
interface ExtractOptions {
    /** Attribute used to locate bind points. Default: 'data-bind' */
    attr?: string;
    /**
     * How to extract <select>. Default: 'value'
     * - 'value': returns select.value
     * - 'label': returns selected option textContent (fallbacks to value)
     */
    selectMode?: 'value' | 'label';
    /** Trim extracted strings. Default: true */
    trim?: boolean;
}
/**
 * Applies a bind-map (or payload) into a DOM scope.
 * - container-first: pass an Element (panel/modal/snippet root)
 * - document fallback: pass null
 */
declare function applyBindings(scope: Element | Document | null, input: BindingsInput, opts?: BindOptions): BindResult;
/**
 * Extracts current values from all elements within scope that declare [data-bind] (or configured attr).
 * Useful for staging/import, debugging, and future round-trip workflows.
 */
declare function extractBindings(scope: Element | Document | null, opts?: ExtractOptions): Record<string, string>;
/**
 * Extract only a requested subset of keys (in declared order),
 * returning empty string for missing elements.
 *
 * This is handy when you want "detail section only" rather than the whole scope.
 */
declare function extractBindingsByKeys(scope: Element | Document | null, keys: string[], opts?: ExtractOptions): Record<string, string>;
/**
 * Clears all bound values within a scope by applying empty string.
 * This intentionally destroys values so CSS-driven labels disappear.
 *
 * Container-first with document fallback.
 */
declare function clearBindings(scope: Element | Document | null, attr?: string): number;

/**
 * Core        | Tblf
 * ---------------------------------------
 * Description : table factory
 * Author      : wogi
 * Created     : 2025-12-19
 * © 2025 tibbot, inc. all rights reserved
 */
interface TblfColumn {
    key: string;
    label: string;
    format?: 'phone' | 'date' | 'zip' | 'bool';
}
interface TblfTable {
    name: string;
    columns: TblfColumn[];
    rows: Array<Record<string, string>>;
}
interface TblfOptions {
    /** Attribute used to locate containers. Default: 'data-table' */
    attr?: string;
    /** Class applied to created <table>. */
    tableClass?: string;
    /** Minimum rows required to render a table. Default: 1 */
    minRowsToRender?: number;
    /**
     * If rows === 0, render a message instead of a table.
     * If omitted, container is cleared and left empty.
     */
    emptyMessage?: string;
    /**
     * Optional: called after the table is rendered.
     * Great place to call Core.insertCheckboxColumn(tableEl, ...) and attach listeners.
     */
    onRendered?: (ctx: TblfRenderedContext) => void;
    /**
     * Optional: called when the table is suppressed or empty.
     * Lets the app show per-table messages or take other actions.
     */
    onSuppressed?: (ctx: TblfSuppressedContext) => void;
}
interface TblfRenderedContext {
    tableKey: string;
    container: HTMLElement;
    tableEl: HTMLTableElement;
    spec: TblfTable;
}
interface TblfSuppressedContext {
    tableKey: string;
    container: HTMLElement;
    spec?: TblfTable;
    reason: 'missing_spec' | 'empty' | 'below_min';
}
/**
 * Renders all DOM containers that declare [data-table="key"] within scope.
 * Only renders tables present in the supplied `tables` map.
 */
declare function renderTables(scope: Element | Document | null, tables: Record<string, TblfTable>, opts?: TblfOptions): void;
/**
 * Renders one specific table key into its container(s) within scope.
 * Useful when you want to refresh a single table after selection changes.
 */
declare function renderTableKey(scope: Element | Document | null, tableKey: string, tables: Record<string, TblfTable>, opts?: TblfOptions): void;

/**
 * Core        | npiq (NPI Query)
 * ---------------------------------------
 * Description : Server-side queries to the CMS NPPES NPI Registry API
 * Author      : wogi
 * Date        : 2025-12-11
 * © 2025 tibbot, inc. all rights reserved
 */
type NpiqMode = 'npi' | 'name';
interface NpiqQueryByNpi {
    mode: 'npi';
    npi: string;
}
interface NpiqQueryByName {
    mode: 'name';
    last_name: string;
    first_name: string;
    state: string;
    enumeration_type?: 'NPI-1' | 'NPI-2';
}
type NpiqQuery = NpiqQueryByNpi | NpiqQueryByName;
interface NpiqOptions {
    baseUrl?: string;
    version?: '2.1';
    timeoutMs?: number;
    maxRetries?: number;
    cacheTtlMs?: number;
    limit?: number;
}
interface NpiqPayload {
    meta: {
        issuedAt: string;
        url: string;
        result_count: number;
    };
    /** Keys match DOM data-bind values exactly (e.g., "basic.first_name"). */
    bind: Record<string, string>;
    /** Keys match DOM data-table values exactly: addr, ploc, taxo, idnt, endp, othn. */
    tables: Record<NpiqTableName, NpiqTable>;
    /** Default selected row idx for each table (or null if none). */
    selected: Record<NpiqTableName, number | null>;
}
type NpiqTableName = 'addr' | 'ploc' | 'taxo' | 'idnt' | 'endp' | 'othn';
interface NpiqTable {
    name: NpiqTableName;
    columns: NpiqColumn[];
    rows: Array<Record<string, string>>;
}
interface NpiqColumn {
    key: string;
    label: string;
    format?: 'phone' | 'date' | 'zip' | 'bool';
}
interface NppesErrorItem {
    description: string;
    field?: string;
    number?: string;
}
declare class NpiqError extends Error {
    readonly url: string;
    readonly errors: NppesErrorItem[];
    constructor(message: string, url: string, errors?: NppesErrorItem[]);
}
declare function npiq(query: NpiqQuery, opts?: NpiqOptions): Promise<NpiqPayload>;

/**
 * Core        | Core
 * ---------------------------------------
 * Description : unified API entry point
 * Author      : wogi
 * Created     : 2025-05-01
 * © 2025 tibbot, inc. all rights reserved
 */
declare const CORE_INSTANCE_ID: string;

export { CORE_INSTANCE_ID, Clct, Detl, Dock, __mdtr as Mdtr, NpiqError, Razr, Sldr, SnipEngine, addClass, addTrListener, applyBindings, attachEventListeners, authenticateUser, buildArray, buildInterface, buildSelect, buildSnip, buildTable, buildUi, callbackMap, cancelLogin, changeCase, checkCredentials, chooseDropDown, clearBindings, clearElement, clearInput, clearRadioChecked, cloneTable, collectInput, convertArray, coreCSSBundle, countCheckedRows, decodeEntities, disableLogin, dismissModal, dismissSpinner, displayAsyncModal, drawAlert, drawConfirm, drawModal, enableLogin, error, exportToDelimited, extractBindings, extractBindingsByKeys, fadeOutAndHide, formatCurrency, formatErrors, formatTime, get, getActivePanel, getArticle, getCookie, getDropDownSelect, getElement, getElementTextContent, getElementValue, getInput, getRadioChecked, getSelectedTableRow, getSnip, getTableRowCount, getTimestampedFilename, handleCaseChange, handleMenuClick, hasRows, hideElement, highlightTableRow, hireMediatorForDock, hireMediatorForSldr, info, initPreferences, initSnip, injectCSS, injectCSSBundle, injectCoreCSS, insertCheckboxColumn, isChecked, isDate, isMultidimensionalArray, isNullOrEmpty, login, loginWrapped, makeTableSortable, npiq, pad, parseJsonArray, parseTableFromString, post, presentSpinner, prettyCurrency, prettyDate, prettyTel, registerCallback, removeClass, removeHighlight, renderSnip, renderTableKey, renderTables, resetControls, rules, selectedResultRow, serializeFragment, setColorScheme, setCookie, setElement, setElementTextContent, setElementValue, setFont, setInnerTextIfExists, setRadioChecked, setSelected, setSliderLabels, setMode as setTheme, showElement, showPanel, showPreferences, showVldtSummaryModal, sortTable, toggleElementDisplay, toggleHiddenClass, toggleMenu, setElementTextContent as updateElementTextContent, setElementValue as updateElementValue, updateNotepad, updateSliderLabels, validateField, validateForm, warn, withSpinner, wrap };
export type { BindOptions, BindResult, BindingsInput, CSSBundle, ClctBlueprint, ClctCallbacks, ClctContext, ClctDetailSpec, ClctPanelSpec, ClctTab, DetailRequest, DetlBlueprint, DetlCallbacks, DetlChoice, DetlContext, DetlIO, DispPayload, DockItem, EventListenerConfig, ExtractOptions, FieldRule, GroupRule, NpiqColumn, NpiqMode, NpiqOptions, NpiqPayload, NpiqQuery, NpiqQueryByName, NpiqQueryByNpi, NpiqTable, NpiqTableName, RazrOptions, RazrParams, SldrConfig, SliderConfig, TblfColumn, TblfOptions, TblfRenderedContext, TblfSuppressedContext, TblfTable, ValidationResult, ValidatorFn };
