import { Fragment } from 'inferno';
import { useBackend } from '../backend';
import { Box, Button, Dimmer, Icon, LabeledList, ProgressBar, Section } from '../components';
import { Window } from '../layouts';
import { InterfaceLockNoticeBox } from './common/InterfaceLockNoticeBox';
import { FullscreenNotice } from './common/FullscreenNotice';

export const APC = (props, context) => {
  const { act, data } = useBackend(context);

  let body = <ApcContent />;

  if (data.gridCheck) {
    body = <GridCheck />;
  } else if (data.failTime) {
    body = <ApcFailure />;
  }

  return (
    <Window width={450} height={390} resizable>
      <Window.Content scrollable>{body}</Window.Content>
    </Window>
  );
};

const powerStatusMap = {
  2: {
    color: 'good',
    externalPowerText: 'External Power',
    chargingText: 'Fully Charged',
  },
  1: {
    color: 'average',
    externalPowerText: 'Low External Power',
    chargingText: 'Charging',
  },
  0: {
    color: 'bad',
    externalPowerText: 'No External Power',
    chargingText: 'Not Charging',
  },
};

const malfMap = {
  1: {
    icon: 'terminal',
    content: 'Override Programming',
    action: 'hack',
  },
  // 2: {
  //   icon: 'caret-square-down',
  //   content: 'Shunt Core Process',
  //   action: 'occupy',
  // },
  // 3: {
  //   icon: 'caret-square-left',
  //   content: 'Return to Main Core',
  //   action: 'deoccupy',
  // },
  // 4: {
  //   icon: 'caret-square-down',
  //   content: 'Shunt Core Process',
  //   action: 'occupy',
  // },
};

const ApcContent = (props, context) => {
  const { act, data } = useBackend(context);
  const locked = data.locked && !data.siliconUser;
  const normallyLocked = data.normallyLocked;
  const externalPowerStatus = powerStatusMap[data.externalPower] || powerStatusMap[0];
  const chargingStatus = powerStatusMap[data.chargingStatus] || powerStatusMap[0];
  const channelArray = data.powerChannels || [];
  // const malfStatus = malfMap[data.malfStatus] || malfMap[0];
  const adjustedCellChange = data.powerCellStatus / 100;

  return (
    <Fragment>
      <InterfaceLockNoticeBox
        deny={data.emagged}
        denialMessage={
          <Fragment>
            <Box color="bad" fontSize="1.5rem">
              Fault in ID authenticator.
            </Box>
            <Box color="bad">Please contact maintenance for service.</Box>
          </Fragment>
        }
      />
      <Section title="Power Status">
        <LabeledList>
          <LabeledList.Item
            label="Main Breaker"
            color={externalPowerStatus.color}
            buttons={
              <Button
                icon={data.isOperating ? 'power-off' : 'times'}
                content={data.isOperating ? 'On' : 'Off'}
                selected={data.isOperating && !locked}
                color={data.isOperating ? '' : 'bad'}
                disabled={locked}
                onClick={() => act('breaker')}
              />
            }>
            [ {externalPowerStatus.externalPowerText} ]
          </LabeledList.Item>
          <LabeledList.Item label="Power Cell">
            <ProgressBar color="good" value={adjustedCellChange} />
          </LabeledList.Item>
          <LabeledList.Item
            label="Charge Mode"
            color={chargingStatus.color}
            buttons={
              <Button
                icon={data.chargeMode ? 'sync' : 'times'}
                content={data.chargeMode ? 'Auto' : 'Off'}
                selected={data.chargeMode}
                disabled={locked}
                onClick={() => act('charge')}
              />
            }>
            [ {chargingStatus.chargingText} ]
          </LabeledList.Item>
        </LabeledList>
      </Section>
      <Section title="Power Channels">
        <LabeledList>
          {channelArray.map((channel) => {
            const { topicParams } = channel;
            return (
              <LabeledList.Item
                key={channel.title}
                label={channel.title}
                buttons={
                  <Fragment>
                    <Box inline mx={2} color={channel.status >= 2 ? 'good' : 'bad'}>
                      {channel.status >= 2 ? 'On' : 'Off'}
                    </Box>
                    <Button
                      icon="sync"
                      content="Auto"
                      selected={(!locked && channel.status === data.pChan_Off_A) || channel.status === data.pChan_On_A}
                      disabled={locked}
                      onClick={() => act('channel', topicParams.auto)}
                    />
                    <Button
                      icon="power-off"
                      content="On"
                      selected={(!locked && channel.status === data.pChan_Off_T) || channel.status === data.pChan_On}
                      disabled={locked}
                      onClick={() => act('channel', topicParams.on)}
                    />
                    <Button
                      icon="times"
                      content="Off"
                      selected={!locked && channel.status === data.pChan_Off}
                      disabled={locked}
                      onClick={() => act('channel', topicParams.off)}
                    />
                  </Fragment>
                }>
                {channel.powerLoad} W
              </LabeledList.Item>
            );
          })}
          <LabeledList.Item label="Total Load">
            {data.totalCharging ? (
              <b>
                {data.totalLoad} W (+ {data.totalCharging} W charging)
              </b>
            ) : (
              <b>{data.totalLoad} W</b>
            )}
          </LabeledList.Item>
        </LabeledList>
      </Section>
      <Section
        title="Misc"
        buttons={
          !!data.siliconUser && (
            <>
              {!!data.malfStatus && (
                <Button
                  icon={malfStatus.icon}
                  content={malfStatus.content}
                  color="bad"
                  onClick={() => act(malfStatus.action)}
                />
              )}
              <Button icon="lightbulb-o" content="Overload" onClick={() => act('overload')} />
            </>
          )
        }>
        <LabeledList>
          <LabeledList.Item
            label="Cover Lock"
            buttons={
              <Button
                tooltip="APC cover can be pried open with a crowbar."
                icon={data.coverLocked ? 'lock' : 'unlock'}
                content={data.coverLocked ? 'Engaged' : 'Disengaged'}
                disabled={locked}
                onClick={() => act('cover')}
              />
            }
          />
        </LabeledList>
      </Section>
    </Fragment>
  );
};

const GridCheck = (props, context) => {
  return (
    <FullscreenNotice title="System Failure">
      <Box fontSize="1.5rem" bold>
        <Icon name="exclamation-triangle" verticalAlign="middle" size={3} mr="1rem" />
      </Box>
      <Box fontSize="1.5rem" bold>
        Power surge detected, grid check in effect...
      </Box>
    </FullscreenNotice>
  );
};

const ApcFailure = (props, context) => {
  const { data, act } = useBackend(context);

  let rebootOptions = <Button icon="repeat" content="Restart Now" color="good" onClick={() => act('reboot')} />;

  if (data.locked && !data.siliconUser) {
    rebootOptions = <Box color="bad">Swipe an ID card for manual reboot.</Box>;
  }

  return (
    <Dimmer textAlign="center">
      <Box color="bad">
        <h1>SYSTEM FAILURE</h1>
      </Box>
      <Box color="average">
        <h2>I/O regulators malfunction detected! Waiting for system reboot...</h2>
      </Box>
      <Box color="good">Automatic reboot in {data.failTime} seconds...</Box>
      <Box mt={4}>{rebootOptions}</Box>
    </Dimmer>
  );
};
