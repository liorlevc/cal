import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UseFormGetValues } from "react-hook-form";
import type { Props } from "react-select";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Avatar,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Label,
  Select,
  Tooltip,
} from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";
import type { FormValues } from "@calcom/web/pages/event-types/[type]";

export type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  priority?: number;
  isFixed?: boolean;
  disabled?: boolean;
};

const priorityOptions = [
  { label: "Lowest", value: 0 },
  { label: "Low", value: 1 },
  { label: "Medium", value: 2 },
  { label: "High", value: 3 },
  { label: "Highest", value: 4 },
];

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  getValues,
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
  getValues: UseFormGetValues<FormValues>;
}) => {
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [currentOption, setCurrentOption] = useState(value[0] ?? null);

  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      <Select
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={true}
        options={options}
        value={value}
        isMulti
        {...props}
      />
      {/* This class name conditional looks a bit odd but it allows a seemless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul
        className={classNames("mb-4 mt-3 rounded-md", value.length >= 1 && "border-subtle border")}
        ref={animationRef}>
        {value.map((option, index) => (
          <>
            <li
              key={option.value}
              className={`flex px-3 py-2 ${index === value.length - 1 ? "" : "border-subtle border-b"}`}>
              <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
              <p className="text-emphasis my-auto ms-3 text-sm">{option.label}</p>
              <div className="ml-auto flex items-center">
                {option && !option.isFixed ? (
                  <Tooltip content={t("change_priority")}>
                    <Button
                      color="minimal"
                      onClick={() => {
                        setPriorityDialogOpen(true);
                        setCurrentOption(option);
                      }}
                      className={classNames(
                        "mr-6 h-2 p-0 text-sm hover:bg-transparent",
                        getPriorityTextAndColor(option.priority).color
                      )}>
                      {t(getPriorityTextAndColor(option.priority).text)}
                    </Button>
                  </Tooltip>
                ) : (
                  <></>
                )}

                <X
                  onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
                  className="my-auto h-4 w-4"
                />
              </div>
            </li>
          </>
        ))}
      </ul>
      {currentOption && !currentOption.isFixed ? (
        <PriorityDialog
          isOpenDialog={priorityDialogOpen}
          setIsOpenDialog={setPriorityDialogOpen}
          getValues={getValues}
          option={currentOption}
          onChange={props.onChange}
        />
      ) : (
        <></>
      )}
    </>
  );
};

interface IPriiorityDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  getValues: UseFormGetValues<FormValues>;
  option: CheckedSelectOption;
  onChange: (value: readonly CheckedSelectOption[]) => void;
}

const PriorityDialog = (props: IPriiorityDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, getValues, onChange } = props;

  const [newPriority, setNewPriority] = useState<{ label: string; value: number }>();
  const setPriority = () => {
    if (!!newPriority) {
      const hosts = getValues("hosts");
      const updatedHosts = hosts
        .filter((host) => !host.isFixed)
        .map((host) => {
          return {
            value: host.userId,
            priority: host.userId === parseInt(option.value, 10) ? newPriority.value : host.priority,
          };
        })
        .sort((a, b) => b.priority - a.priority);
      onChange(updatedHosts);
    }
    setIsOpenDialog(false);
  };
  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("set_priority")}>
        <div className="mb-4">
          <Label>{t("priority_for_user", { userName: option.label })}</Label>
          <Select
            defaultValue={priorityOptions[option.priority ?? 2]}
            value={newPriority}
            onChange={(value) => setNewPriority(value ?? priorityOptions[2])}
            options={[
              { label: t("Lowest"), value: 0 },
              { label: t("low"), value: 1 },
              { label: t("medium"), value: 2 },
              { label: t("high"), value: 3 },
              { label: t("highest"), value: 4 },
            ]}
          />
        </div>

        <DialogFooter>
          <DialogClose />
          <Button onClick={setPriority}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getPriorityTextAndColor = (priority?: number) => {
  switch (priority) {
    case 0:
      return { text: "lowest", color: "text-gray-300" };
    case 1:
      return { text: "low", color: "text-gray-400" };
    case 2:
      return { text: "medium", color: "text-gray-500" };
    case 3:
      return { text: "high", color: "text-gray-600" };
    case 4:
      return { text: "highest", color: "text-gray-700" };
    default:
      return { text: "medium", color: "text-gray-500" };
  }
};

export default CheckedTeamSelect;
