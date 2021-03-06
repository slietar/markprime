import * as React from 'react';


export default React.memo(function Icon(props) {
  return (
    <svg className={'icon ' + (props.className ?? '')}>
      {props.name && <use href={`#icon-${props.name}`} />}
    </svg>
  );
});
