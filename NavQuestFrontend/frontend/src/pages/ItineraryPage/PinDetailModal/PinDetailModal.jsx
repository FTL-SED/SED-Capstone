import './PinDetailModal.css'
import PinName from '../PinName/PinName.jsx'
import PinImage from '../PinImage/PinImage.jsx'
import PinTiming from '../PinTiming/PinTiming.jsx'
import PinCost from '../PinCost/PinCost.jsx'
import PinAddress from '../PinAddress/PinAddress.jsx'

function PinDetailModal({ pin = {} }) {
  return (
    <div className="pin-detail-modal">
      <PinImage src={pin.locationImageUrl} />
      <PinName name={pin.name} />
      <PinTiming startTime={pin.startTime} endTime={pin.endTime} />
      <PinCost cost={pin.pricePerPerson} />
      <PinAddress address={pin.address} />
    </div>
  );
}

export default PinDetailModal;
