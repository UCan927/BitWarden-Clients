import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";

import AutofillField from "../../models/autofill-field";
import { ElementWithOpId, FormFieldElement } from "../../types";

interface AutofillOverlayContentService {
  isFieldCurrentlyFocused: boolean;
  isCurrentlyFilling: boolean;
  isOverlayCiphersPopulated: boolean;
  init(): void;
  setupAutofillOverlayListenerOnField(
    autofillFieldElement: ElementWithOpId<FormFieldElement>,
    autofillFieldData: AutofillField
  ): Promise<void>;
  openAutofillOverlay(
    isFocusingFieldElement?: boolean,
    isOpeningFullOverlay?: boolean,
    authStatus?: AuthenticationStatus
  ): void;
  removeAutofillOverlay(): void;
  removeAutofillOverlayButton(): void;
  removeAutofillOverlayList(): void;
  addNewVaultItem(): void;
  redirectOverlayFocusOut(direction: "previous" | "next"): void;
  focusMostRecentOverlayField(): void;
  blurMostRecentOverlayField(): void;
}

export { AutofillOverlayContentService };
