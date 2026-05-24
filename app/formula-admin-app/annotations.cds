using BidEqualizationService as service from '../../srv/service';
annotate service.BidFormulas with @(
    UI.HeaderInfo         : {
        TypeName      : 'Formula',
        TypeNamePlural: 'Formulas',
        Title         : {Value: name}
    },
     UI.SelectionFields : [
        leftBenchmarkBidTypeDesc,
        leftDevelopmentType,
        leftDeliveryModeDesc ,
        leftBidValueRangeDesc ,
        leftExceptionalWeight ,
        rightLocalBidTypeDesc 
    ],
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            
            {
                $Type : 'UI.DataField',
                Value : leftBenchmarkBidTypeDesc,
            },
            {
                $Type : 'UI.DataField',                
                Value : leftDevelopmentType,
            },
            {
                $Type : 'UI.DataField',
                Value : leftDeliveryModeDesc,
            },
            {
                $Type : 'UI.DataField',
                Value : leftBidValueRangeDesc,
            },
            {
                $Type : 'UI.DataField',
                Value : leftExceptionalWeight,
            },
            {
                $Type : 'UI.DataField',               
                Value : rightLocalBidTypeDesc,
            },
            {
                $Type : 'UI.DataField',
                Value : expression,
            },
            {
                $Type : 'UI.DataField',
                Value : trafficexpression,
            },
            {
                $Type : 'UI.DataField',
                Value : dutyexpression,
            },
            {
                $Type : 'UI.DataField',
                Value : premiumexpression,
            },
            {
                $Type : 'UI.DataField',
                Value : ldorexpression,
            }
            
            
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'Formula Details',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : name,
        },
        {
                $Type : 'UI.DataField',
                Value : leftBenchmarkBidTypeDesc,
            },
            {
                $Type : 'UI.DataField',                
                Value : leftDevelopmentType,
            },
            {
                $Type : 'UI.DataField',
                Value : leftDeliveryModeDesc,
            },
            {
                $Type : 'UI.DataField',
                Value : leftBidValueRangeDesc,
            },
            {
                $Type : 'UI.DataField',
                Value : leftExceptionalWeight,
            },
            {
                $Type : 'UI.DataField',               
                Value : rightLocalBidTypeDesc,
            },
        {
            $Type : 'UI.DataField',
            Value : expression,
        },
        {
            $Type : 'UI.DataField',
            Value : trafficexpression,
        },
        {
            $Type : 'UI.DataField',
            Value : dutyexpression,
        },
        {
            $Type : 'UI.DataField',
            Value : premiumexpression,
        },
         
            {
                $Type : 'UI.DataField',
                Value : ldorexpression,
            },
    ],

    
);

annotate service.BidFormulas with {
    leftBenchmarkBidTypeDesc @Common.ValueList : {
        CollectionPath : 'VH_leftBenchmarkBidTypeDesc',
        Parameters     : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : leftBenchmarkBidTypeDesc, ValueListProperty : 'leftBenchmarkBidTypeDesc' }
        ]
    };

    leftDevelopmentType @Common.ValueList : {
        CollectionPath : 'VH_leftDevelopmentType',
        Parameters     : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : leftDevelopmentType, ValueListProperty : 'leftDevelopmentType' }
        ]
    };

    leftDeliveryModeDesc @Common.ValueList : {
        CollectionPath : 'VH_leftDeliveryModeDesc',
        Parameters     : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : leftDeliveryModeDesc, ValueListProperty : 'leftDeliveryModeDesc' }
        ]
    };

    leftBidValueRangeDesc @Common.ValueList : {
        CollectionPath : 'VH_leftBidValueRangeDesc',
        Parameters     : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : leftBidValueRangeDesc, ValueListProperty : 'leftBidValueRangeDesc' }
        ]
    };

    leftExceptionalWeight @Common.ValueList : {
        CollectionPath : 'VH_leftExceptionalWeight',
        Parameters     : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : leftExceptionalWeight, ValueListProperty : 'leftExceptionalWeight' }
        ]
    };

    rightLocalBidTypeDesc @Common.ValueList : {
        CollectionPath : 'VH_rightLocalBidTypeDesc',
        Parameters     : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : rightLocalBidTypeDesc, ValueListProperty : 'rightLocalBidTypeDesc' }
        ]
    };
}




