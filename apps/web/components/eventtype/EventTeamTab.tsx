import { Trans } from "next-i18next";
import Link from "next/link";
import type { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { Options } from "react-select";

import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import ChildrenEventTypeSelect from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Label, Select, SettingsToggle } from "@calcom/ui";

interface IUserToValue {
  id: number | null;
  name: string | null;
  username: string | null;
  avatar: string;
  email: string;
}

const mapUserToValue = ({ id, name, username, avatar, email }: IUserToValue, pendingString: string) => ({
  value: `${id || ""}`,
  label: `${name || email || ""}${!username ? ` (${pendingString})` : ""}`,
  avatar,
  email,
});

export const mapMemberToChildrenOption = (
  member: EventTypeSetupProps["teamMembers"][number],
  slug: string,
  pendingString: string
) => {
  return {
    slug,
    hidden: false,
    created: false,
    owner: {
      id: member.id,
      name: member.name ?? "",
      email: member.email,
      username: member.username ?? "",
      membership: member.membership,
      eventTypeSlugs: member.eventTypes ?? [],
      avatar: member.avatar,
    },
    value: `${member.id ?? ""}`,
    label: `${member.name || member.email || ""}${!member.username ? ` (${pendingString})` : ""}`,
  };
};

const sortByLabel = (a: ReturnType<typeof mapUserToValue>, b: ReturnType<typeof mapUserToValue>) => {
  if (a.label < b.label) {
    return -1;
  }
  if (a.label > b.label) {
    return 1;
  }
  return 0;
};

const ChildrenEventTypesList = ({
  options = [],
  value,
  onChange,
  ...rest
}: {
  value: ReturnType<typeof mapMemberToChildrenOption>[];
  onChange?: (options: ReturnType<typeof mapMemberToChildrenOption>[]) => void;
  options?: Options<ReturnType<typeof mapMemberToChildrenOption>>;
} & Omit<Partial<ComponentProps<typeof ChildrenEventTypeSelect>>, "onChange" | "value">) => {
  const { t } = useLocale();
  return (
    <div className="flex flex-col space-y-5">
      <div>
        <Label>{t("assign_to")}</Label>
        <ChildrenEventTypeSelect
          aria-label="assignment-dropdown"
          data-testid="assignment-dropdown"
          onChange={(options) => {
            onChange &&
              onChange(
                options.map((option) => ({
                  ...option,
                }))
              );
          }}
          value={value}
          options={options.filter((opt) => !value.find((val) => val.owner.id.toString() === opt.value))}
          controlShouldRenderValue={false}
          {...rest}
        />
      </div>
    </div>
  );
};

const AssignAllTeamMembers = ({
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  onActive,
  onInactive,
}: {
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  onActive: () => void;
  onInactive?: () => void;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  return (
    <Controller<FormValues>
      name="assignAllTeamMembers"
      render={() => (
        <SettingsToggle
          title={t("automatically_add_all_team_members")}
          labelClassName="mt-0.5 font-normal"
          checked={assignAllTeamMembers}
          onCheckedChange={(active) => {
            formMethods.setValue("assignAllTeamMembers", active);
            setAssignAllTeamMembers(active);
            if (active) {
              onActive();
            } else if (!!onInactive) {
              onInactive();
            }
          }}
        />
      )}
    />
  );
};

const CheckedHostField = ({
  labelText,
  placeholder,
  options = [],
  isFixed,
  value,
  onChange,
  helperText,
  ...rest
}: {
  labelText?: string;
  placeholder: string;
  isFixed: boolean;
  value: { isFixed: boolean; userId: number }[];
  onChange?: (options: { isFixed: boolean; userId: number }[]) => void;
  options?: Options<CheckedSelectOption>;
  helperText?: React.ReactNode | string;
} & Omit<Partial<ComponentProps<typeof CheckedTeamSelect>>, "onChange" | "value">) => {
  return (
    <div className="flex flex-col rounded-md">
      <div>
        {labelText ? <Label>{labelText}</Label> : <></>}
        <CheckedTeamSelect
          isOptionDisabled={(option) => !!value.find((host) => host.userId.toString() === option.value)}
          onChange={(options) => {
            onChange &&
              onChange(
                options.map((option) => ({
                  isFixed,
                  userId: parseInt(option.value, 10),
                }))
              );
          }}
          value={(value || [])
            .filter(({ isFixed: _isFixed }) => isFixed === _isFixed)
            .map(
              (host) =>
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                options.find((member) => member.value === host.userId.toString())!
            )
            .filter(Boolean)}
          controlShouldRenderValue={false}
          options={options}
          placeholder={placeholder}
          {...rest}
        />
      </div>
    </div>
  );
};

const FixedHostHelper = (
  <Trans i18nKey="fixed_host_helper">
    Add anyone who needs to attend the event.
    <Link
      className="underline underline-offset-2"
      target="_blank"
      href="https://cal.com/docs/enterprise-features/teams/round-robin-scheduling#fixed-hosts">
      Learn more
    </Link>
  </Trans>
);

const FixedHosts = ({
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  automaticAddAllEnabled,
  setValue,
}: {
  value: { isFixed: boolean; userId: number }[];
  onChange: (hosts: { isFixed: boolean; userId: number }[]) => void;
  teamMembers: {
    value: string;
    label: string;
    avatar: string;
    email: string;
  }[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  automaticAddAllEnabled: boolean;
  setValue: UseFormSetValue<FormValues>;
}) => {
  const { t } = useLocale();

  return (
    <div className="rounded-lg ">
      <div className="border-subtle mt-5 rounded-t-md border p-6 pb-5">
        <Label className="mb-1 text-sm font-semibold">{t("fixed_hosts")}</Label>
        <p className="text-subtle max-w-full break-words text-sm leading-tight">{FixedHostHelper}</p>
      </div>
      <div className="border-subtle rounded-b-md border border-t-0">
        <AddMembersWithSwitch
          teamMembers={teamMembers}
          value={value}
          onChange={onChange}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={automaticAddAllEnabled}
          isFixed={true}
          onActive={() =>
            setValue(
              "hosts",
              teamMembers.map((teamMember) => ({
                isFixed: true,
                userId: parseInt(teamMember.value, 10),
              }))
            )
          }
        />
      </div>
    </div>
  );
};

const AddMembersWithSwitch = ({
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  automaticAddAllEnabled,
  onActive,
  isFixed,
}: {
  value: { isFixed: boolean; userId: number }[];
  onChange: (hosts: { isFixed: boolean; userId: number }[]) => void;
  teamMembers: {
    value: string;
    label: string;
    avatar: string;
    email: string;
  }[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  automaticAddAllEnabled: boolean;
  onActive: () => void;
  isFixed: boolean;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  return (
    <div className="rounded-md ">
      <div className="flex flex-col rounded-md px-6 pb-2 pt-6">
        <div className="mb-2">
          {automaticAddAllEnabled ? (
            <AssignAllTeamMembers
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              onActive={onActive}
              onInactive={() => formMethods.setValue("hosts", [])}
            />
          ) : (
            <></>
          )}
        </div>
        {assignAllTeamMembers && automaticAddAllEnabled ? (
          <div className="" />
        ) : (
          <CheckedHostField
            value={value}
            onChange={onChange}
            isFixed={isFixed}
            options={teamMembers.sort(sortByLabel)}
            placeholder={t("add_attendees")}
          />
        )}
      </div>
    </div>
  );
};

const RoundRobinHosts = ({
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  setValue,
}: {
  value: { isFixed: boolean; userId: number }[];
  onChange: (hosts: { isFixed: boolean; userId: number }[]) => void;
  teamMembers: {
    value: string;
    label: string;
    avatar: string;
    email: string;
  }[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  setValue: UseFormSetValue<FormValues>;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  return (
    <div className="rounded-lg ">
      <div className="border-subtle mt-5 rounded-t-md border p-6 pb-5">
        <Label className="mb-1 text-sm font-semibold">{t("round_robin_hosts")}</Label>
        <p className="text-subtle max-w-full break-words text-sm leading-tight">{t("round_robin_helper")}</p>
      </div>
      <div className="border-subtle rounded-b-md border border-t-0">
        <AddMembersWithSwitch
          teamMembers={teamMembers}
          value={value}
          onChange={onChange}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={true}
          isFixed={false}
          onActive={() =>
            setValue(
              "hosts",
              teamMembers.map((teamMember) => ({
                isFixed: false,
                userId: parseInt(teamMember.value, 10),
              }))
            )
          }
        />
      </div>
    </div>
  );
};

const ChildrenEventTypes = ({
  childrenEventTypeOptions,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
}: {
  childrenEventTypeOptions: ReturnType<typeof mapMemberToChildrenOption>[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
}) => {
  const formMethods = useFormContext<FormValues>();
  return (
    <div className="border-subtle mt-6 space-y-5 rounded-lg border px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4">
        <AssignAllTeamMembers
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          onActive={() => formMethods.setValue("children", childrenEventTypeOptions)}
        />
        {!assignAllTeamMembers ? (
          <Controller<FormValues>
            name="children"
            render={({ field: { onChange, value } }) => (
              <ChildrenEventTypesList value={value} options={childrenEventTypeOptions} onChange={onChange} />
            )}
          />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

const Hosts = ({
  teamMembers,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
}: {
  teamMembers: {
    value: string;
    label: string;
    avatar: string;
    email: string;
  }[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
}) => {
  const { t } = useLocale();
  const {
    control,
    resetField,
    getValues,
    formState: { submitCount },
  } = useFormContext<FormValues>();
  const schedulingType = useWatch({
    control,
    name: "schedulingType",
  });
  const initialValue = useRef<{
    hosts: FormValues["hosts"];
    schedulingType: SchedulingType | null;
    submitCount: number;
  } | null>(null);

  useEffect(() => {
    // Handles init & out of date initial value after submission.
    if (!initialValue.current || initialValue.current?.submitCount !== submitCount) {
      initialValue.current = { hosts: getValues("hosts"), schedulingType, submitCount };
      return;
    }
    resetField("hosts", {
      defaultValue: initialValue.current.schedulingType === schedulingType ? initialValue.current.hosts : [],
    });
  }, [schedulingType, resetField, getValues, submitCount]);

  const formMethods = useFormContext<FormValues>();
  return (
    <Controller<FormValues>
      name="hosts"
      render={({ field: { onChange, value } }) => {
        const schedulingTypeRender = {
          COLLECTIVE: (
            <FixedHosts
              teamMembers={teamMembers}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              automaticAddAllEnabled={true}
              setValue={formMethods.setValue}
            />
          ),
          ROUND_ROBIN: (
            <>
              <FixedHosts
                teamMembers={teamMembers}
                value={value}
                onChange={(changeValue) => {
                  onChange([...value.filter(({ isFixed }) => !isFixed), ...changeValue]);
                }}
                assignAllTeamMembers={assignAllTeamMembers}
                setAssignAllTeamMembers={setAssignAllTeamMembers}
                automaticAddAllEnabled={false}
                setValue={formMethods.setValue}
              />
              <RoundRobinHosts
                teamMembers={teamMembers}
                value={value}
                onChange={(changeValue) => {
                  onChange([...value.filter(({ isFixed }) => isFixed), ...changeValue]);
                }}
                assignAllTeamMembers={assignAllTeamMembers}
                setAssignAllTeamMembers={setAssignAllTeamMembers}
                setValue={formMethods.setValue}
              />
            </>
          ),
          MANAGED: <></>,
        };
        return !!schedulingType ? schedulingTypeRender[schedulingType] : <></>;
      }}
    />
  );
};

export const EventTeamTab = ({
  team,
  teamMembers,
  eventType,
}: Pick<EventTypeSetupProps, "teamMembers" | "team" | "eventType">) => {
  const { t } = useLocale();

  const schedulingTypeOptions: {
    value: SchedulingType;
    label: string;
    // description: string;
  }[] = [
    {
      value: "COLLECTIVE",
      label: t("collective"),
      // description: t("collective_description"),
    },
    {
      value: "ROUND_ROBIN",
      label: t("round_robin"),
      // description: t("round_robin_description"),
    },
  ];
  const pendingMembers = (member: (typeof teamMembers)[number]) =>
    !!eventType.team?.parentId || !!member.username;
  const teamMembersOptions = teamMembers
    .filter(pendingMembers)
    .map((member) => mapUserToValue(member, t("pending")));
  const childrenEventTypeOptions = teamMembers.filter(pendingMembers).map((member) => {
    return mapMemberToChildrenOption(
      { ...member, eventTypes: member.eventTypes.filter((et) => et !== eventType.slug) },
      eventType.slug,
      t("pending")
    );
  });
  const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
  const formMethods = useFormContext<FormValues>();
  const [assignAllTeamMembers, setAssignAllTeamMembers] = useState<boolean>(
    formMethods.getValues("assignAllTeamMembers") ?? false
  );

  return (
    <div>
      {team && !isManagedEventType && (
        <>
          <div className="border-subtle flex flex-col rounded-md">
            <div className="border-subtle rounded-t-md border p-6 pb-5">
              <Label className="mb-1 text-sm font-semibold">{t("assignment")}</Label>
              <p className="text-subtle max-w-full break-words text-sm leading-tight">
                {t("assignment_description")}
              </p>
            </div>
            <div className="border-subtle rounded-b-md border border-t-0 p-6">
              <Label>{t("scheduling_type")}</Label>
              <Controller<FormValues>
                name="schedulingType"
                render={({ field: { value, onChange } }) => (
                  <Select
                    options={schedulingTypeOptions}
                    value={schedulingTypeOptions.find((opt) => opt.value === value)}
                    className="w-full"
                    onChange={(val) => {
                      onChange(val?.value);
                      formMethods.setValue("assignAllTeamMembers", false);
                      setAssignAllTeamMembers(false);
                    }}
                  />
                )}
              />
            </div>
          </div>
          <Hosts
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={setAssignAllTeamMembers}
            teamMembers={teamMembersOptions}
          />
        </>
      )}
      {team && isManagedEventType && (
        <ChildrenEventTypes
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          childrenEventTypeOptions={childrenEventTypeOptions}
        />
      )}
    </div>
  );
};
