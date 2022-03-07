import { $column, $row, screenUtils } from "@aelea/ui-components"

export const $responsiveFlex = screenUtils.isDesktopScreen ? $row : $column


