import { styled } from '@mui/joy'

const LogoText = styled('p')`
  font-family: 'Public Sans', Menlo, Courier, monospace;
  font-feature-settings: 'calt' 1, 'kern' 1, 'liga' 1;
  font-weight: 400;
  font-size: 22px;
  margin: 0;
  background: linear-gradient(
    60deg,
    hsl(0, 75%, 50%) 5%,
    hsl(260, 75%, 50%) 35%,
    hsl(200, 75%, 50%) 65%,
    hsl(220, 75%, 50%) 95%
  );
  color: #fff;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke-width: thin;
  -webkit-text-stroke-color: rgb(255 255 255 / 35%);
`

export default function () {
  return <LogoText>Mixpoint</LogoText>
}